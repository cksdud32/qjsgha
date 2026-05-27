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

  const adminChannelId = process.env.ADMIN_CHANNEL_ID;
  if (!adminChannelId) {
    return response.status(500).json({ error: 'ADMIN_CHANNEL_ID not set' });
  }

  try {
    const { rows } = await pool.query(
      `SELECT id, track_title, tj_title, tj_number, nat_type, is_cover
       FROM pending_karaoke
       ORDER BY id ASC`
    );

    if (rows.length === 0) {
      return response.status(200).json({ success: true, message: '처리 대기 중인 항목이 없습니다.' });
    }

    const botToken = process.env.DISCORD_BOT_TOKEN;

    const sendResults = await Promise.allSettled(
      rows.map(row => {
        const natLabel = row.nat_type === 1 ? '한국' : '일본';
        const coverLabel = row.is_cover ? `커버 (${natLabel})` : '오리지널';

        const body = JSON.stringify({
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
              {
                type: 2,
                style: 3,
                label: '✅ 등록',
                custom_id: `reg:${row.id}`
              },
              {
                type: 2,
                style: 4,
                label: '❌ 기각',
                custom_id: `rej:${row.id}`
              }
            ]
          }]
        });

        return fetch(`https://discord.com/api/v10/channels/${adminChannelId}/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bot ${botToken}`
          },
          body
        }).then(async r => {
          if (!r.ok) throw new Error(await r.text());
          return row.id;
        });
      })
    );

    const succeeded = sendResults.filter(r => r.status === 'fulfilled').length;
    const failed = sendResults
      .filter(r => r.status === 'rejected')
      .map(r => r.reason?.message);

    return response.status(200).json({
      success: true,
      message: `${succeeded}개 전송 완료`,
      ...(failed.length > 0 && { errors: failed })
    });
  } catch (err) {
    console.error('karaoke-pending-notify 오류:', err);
    return response.status(500).json({ success: false, error: err.message });
  }
}
