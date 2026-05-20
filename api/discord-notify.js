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

    const result = await pool.query(
      `SELECT name, date_label, status FROM concert WHERE event_date = $1`,
      [todayStr]
    );

    if (result.rows.length === 0) {
      return response.status(200).json({ success: true, message: '오늘 예정된 콘서트가 없습니다.' });
    }

    const embeds = result.rows.map(c => ({
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

    const discordRes = await fetch(process.env.DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: '🔔 **오늘 류현준 님의 오프라인 일정이 있습니다!**',
        embeds
      })
    });

    if (!discordRes.ok) throw new Error('디스코드 웹훅 전송 실패');

    return response.status(200).json({ success: true, message: `${result.rows.length}건 알림 전송 완료` });
  } catch (error) {
    console.error('Discord notify error:', error);
    return response.status(500).json({ success: false, error: error.message });
  }
}
