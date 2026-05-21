import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: { rejectUnauthorized: false }
});

export default async function handler(request, response) {
  const authHeader = request.headers['authorization'];
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return response.status(401).send('Unauthorized');
  }

  try {
    // KST 기준 오늘 날짜 (UTC+9)
    const now = new Date();
    const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    const todayStr = kst.toISOString().slice(0, 10);

    const concertResult = await pool.query(
      `SELECT name, date_label, status FROM concert WHERE event_date = $1`,
      [todayStr]
    );

    let embeds, content;

    if (concertResult.rows.length > 0) {
      // 오늘 콘서트 있음
      content = '🔔 **오늘 류현준 님의 오프라인 일정이 있습니다!**';
      embeds = concertResult.rows.map(c => ({
        title: '🎵 오늘 류현준 오프라인 일정이 있습니다!',
        color: 0xCCA6E8,
        fields: [
          { name: '📌 콘서트', value: c.name, inline: true },
          { name: '📅 날짜', value: c.date_label || todayStr, inline: true },
          { name: '🎫 상태', value: c.status || '진행 예정', inline: true }
        ],
        description: '[류현준 비공식 팬사이트](https://dear-hyeonjun.vercel.app)',
        timestamp: new Date().toISOString()
      }));
    } else {
      // 오늘 콘서트 없음 → 가장 가까운 예정 콘서트 D-day
      const nextResult = await pool.query(
        `SELECT name, date_label, event_date FROM concert WHERE event_date > $1 ORDER BY event_date ASC LIMIT 1`,
        [todayStr]
      );

      if (nextResult.rows.length === 0) {
        return response.status(200).json({ success: true, message: '예정된 콘서트가 없습니다.' });
      }

      const next = nextResult.rows[0];
      const diffMs = new Date(next.event_date) - new Date(todayStr);
      const dDay = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      content = `📅 **류현준 님의 다음 오프라인 일정까지 D-${dDay}!**`;
      embeds = [{
        title: `🗓️ 다음 일정 — D-${dDay}`,
        color: 0xCCA6E8,
        fields: [
          { name: '📌 콘서트', value: next.name, inline: true },
          { name: '📅 날짜', value: next.date_label || String(next.event_date).slice(0, 10), inline: true }
        ],
        description: '[류현준 비공식 팬사이트](https://dear-hyeonjun.vercel.app)',
        timestamp: new Date().toISOString()
      }];
    }

    const messageBody = JSON.stringify({ content, embeds });

    // 구독한 채널 목록 조회
    const channelsResult = await pool.query(`SELECT channel_id FROM discord_channels`);

    if (channelsResult.rows.length === 0) {
      return response.status(200).json({ success: true, message: '구독 채널이 없습니다.' });
    }

    const botToken = process.env.DISCORD_BOT_TOKEN;

    const sendResults = await Promise.allSettled(
      channelsResult.rows.map(row =>
        fetch(`https://discord.com/api/v10/channels/${row.channel_id}/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bot ${botToken}`
          },
          body: messageBody
        }).then(async r => {
          if (!r.ok) {
            const err = await r.text();
            throw new Error(`channel ${row.channel_id}: ${err}`);
          }
          return row.channel_id;
        })
      )
    );

    const succeeded = sendResults.filter(r => r.status === 'fulfilled').length;
    const failed = sendResults.filter(r => r.status === 'rejected').map(r => r.reason?.message);

    return response.status(200).json({
      success: true,
      message: `${succeeded}개 채널 전송 완료`,
      ...(failed.length > 0 && { errors: failed })
    });
  } catch (error) {
    console.error('Discord notify error:', error);
    return response.status(500).json({ success: false, error: error.message });
  }
}
