import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: { rejectUnauthorized: false }
});

async function handleConcert(botToken) {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const todayStr = kst.toISOString().slice(0, 10);

  const concertResult = await pool.query(
    `SELECT name, date_label, status FROM concert WHERE event_date = $1`,
    [todayStr]
  );

  let embeds, content;

  if (concertResult.rows.length > 0) {
    content = '🔔 **오늘 류현준 님의 오프라인 일정이 있습니다!**';
    embeds = concertResult.rows.map(c => ({
      title: '🎵 오늘 류현준 오프라인 일정이 있습니다!',
      color: 0xCCA6E8,
      fields: [
        { name: '📌 콘서트', value: c.name, inline: true },
        { name: '📅 날짜', value: c.date_label || todayStr, inline: true },
        { name: '🎫 상태', value: c.status || '진행 예정', inline: true }
      ],
      description: '[자세한 정보 보기](https://dear-hyeonjun.vercel.app/html/inf.html)',
      footer: { text: '류현준 비공식 팬사이트 알리미' },
      timestamp: new Date().toISOString()
    }));
  } else {
    const nextResult = await pool.query(
      `SELECT name, date_label, event_date FROM concert WHERE event_date > $1 ORDER BY event_date ASC LIMIT 1`,
      [todayStr]
    );

    if (nextResult.rows.length === 0) {
      return { success: true, message: '예정된 콘서트가 없습니다.' };
    }

    const next = nextResult.rows[0];
    const dDay = Math.ceil((new Date(next.event_date) - new Date(todayStr)) / (1000 * 60 * 60 * 24));

    content = `📅 **류현준 님의 다음 오프라인 일정까지 D-${dDay}!**`;
    embeds = [{
      title: `🗓️ 다음 일정 — D-${dDay}`,
      color: 0xCCA6E8,
      fields: [
        { name: '📌 콘서트', value: next.name, inline: true },
        { name: '📅 날짜', value: next.date_label || String(next.event_date).slice(0, 10), inline: true }
      ],
      description: '[자세한 정보 보기](https://dear-hyeonjun.vercel.app/html/inf.html)',
      footer: { text: '류현준 비공식 팬사이트 알리미' },
      timestamp: new Date().toISOString()
    }];
  }

  const channelsResult = await pool.query(`SELECT channel_id FROM discord_channels`);
  if (channelsResult.rows.length === 0) {
    return { success: true, message: '구독 채널이 없습니다.' };
  }

  const messageBody = JSON.stringify({ content, embeds });
  const sendResults = await Promise.allSettled(
    channelsResult.rows.map(row =>
      fetch(`https://discord.com/api/v10/channels/${row.channel_id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bot ${botToken}` },
        body: messageBody
      }).then(async r => {
        if (!r.ok) throw new Error(`channel ${row.channel_id}: ${await r.text()}`);
        return row.channel_id;
      })
    )
  );

  const succeeded = sendResults.filter(r => r.status === 'fulfilled').length;
  const failed = sendResults.filter(r => r.status === 'rejected').map(r => r.reason?.message);
  return { success: true, message: `${succeeded}개 채널 전송 완료`, ...(failed.length > 0 && { errors: failed }) };
}

async function handleKaraoke(botToken) {
  const adminChannelId = process.env.ADMIN_CHANNEL_ID;
  if (!adminChannelId) return { success: false, error: 'ADMIN_CHANNEL_ID not set' };

  const { rows } = await pool.query(
    `SELECT id, track_title, tj_title, tj_number, nat_type, is_cover FROM pending_karaoke ORDER BY id ASC`
  );

  if (rows.length === 0) {
    return { success: true, message: '처리 대기 중인 항목이 없습니다.' };
  }

  const sendResults = await Promise.allSettled(
    rows.map(row => {
      const natLabel = row.nat_type === 1 ? '한국' : '일본';
      const coverLabel = row.is_cover ? `커버 (${natLabel})` : '오리지널';

      return fetch(`https://discord.com/api/v10/channels/${adminChannelId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bot ${botToken}` },
        body: JSON.stringify({
          embeds: [{
            title: '🎤 노래방 번호 등록 요청',
            color: 0xCCA6E8,
            fields: [
              { name: '곡 제목', value: row.track_title, inline: true },
              { name: 'TJ 제목', value: row.tj_title || '—', inline: true },
              { name: 'TJ 번호', value: String(row.tj_number), inline: true },
              { name: '종류', value: coverLabel, inline: true }
            ],
            footer: { text: `pending_id: ${row.id}` },
            timestamp: new Date().toISOString()
          }],
          components: [{
            type: 1,
            components: [
              { type: 2, style: 3, label: '✅ 등록', custom_id: `reg:${row.id}` },
              { type: 2, style: 4, label: '❌ 기각', custom_id: `rej:${row.id}` }
            ]
          }]
        })
      }).then(async r => {
        if (!r.ok) throw new Error(await r.text());
        return row.id;
      });
    })
  );

  const succeeded = sendResults.filter(r => r.status === 'fulfilled').length;
  const failed = sendResults.filter(r => r.status === 'rejected').map(r => r.reason?.message);
  return { success: true, message: `${succeeded}개 전송 완료`, ...(failed.length > 0 && { errors: failed }) };
}

export default async function handler(request, response) {
  const authHeader = request.headers['authorization'];
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return response.status(401).send('Unauthorized');
  }

  const type = request.query.type ?? 'concert';
  const botToken = process.env.DISCORD_BOT_TOKEN;

  try {
    const result = type === 'karaoke'
      ? await handleKaraoke(botToken)
      : await handleConcert(botToken);

    const status = result.success === false ? 500 : 200;
    return response.status(status).json(result);
  } catch (error) {
    console.error('discord-notify 오류:', error);
    return response.status(500).json({ success: false, error: error.message });
  }
}
