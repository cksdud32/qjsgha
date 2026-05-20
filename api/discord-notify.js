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

    if (concertResult.rows.length === 0) {
      return response.status(200).json({ success: true, message: '오늘 예정된 콘서트가 없습니다.' });
    }

    const embeds = concertResult.rows.map(c => ({
      title: '🎵 오늘 류현준 오프라인 일정이 있습니다!',
      color: 0xCCA6E8,
      fields: [
        { name: '📌 콘서트', value: c.name, inline: true },
        { name: '📅 날짜', value: c.date_label || todayStr, inline: true },
        { name: '🎫 상태', value: c.status || '진행 예정', inline: true }
      ],
      footer: { text: '류현준 비공식 팬사이트 알리미' },
      timestamp: new Date().toISOString()
    }));

    const messageBody = JSON.stringify({
      content: '🔔 **오늘 류현준 님의 오프라인 일정이 있습니다!**',
      embeds
    });

    // 구독한 채널의 웹훅 URL 목록 조회
    const channelsResult = await pool.query(`SELECT webhook_url FROM discord_channels`);

    if (channelsResult.rows.length === 0) {
      return response.status(200).json({ success: true, message: '구독 채널이 없습니다.' });
    }

    const sendResults = await Promise.allSettled(
      channelsResult.rows.map(row =>
        fetch(row.webhook_url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: messageBody
        }).then(async r => {
          if (!r.ok) {
            const err = await r.text();
            throw new Error(`webhook error: ${err}`);
          }
          return row.webhook_url;
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
