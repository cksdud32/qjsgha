import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).send('Method Not Allowed');
  }

  try {
    const body = typeof request.body === 'string' ? JSON.parse(request.body) : request.body;
    const { name, stopwatch } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return response.status(400).json({ error: '닉네임을 입력해주세요.' });
    }

    const parsedStopwatch = Number(stopwatch);
    if (!Number.isFinite(parsedStopwatch) || parsedStopwatch < 0) {
      return response.status(400).json({ error: '올바른 stopwatch 값을 전달해주세요.' });
    }

    await pool.query(
      "DELETE FROM ticketing_practice WHERE stopwatch = 0 AND updated_at < NOW() - INTERVAL '200 seconds'"
    );

    // 같은 닉네임의 완료 기록이 있으면 기존 id 반환
    const existing = await pool.query(
      'SELECT id, stopwatch FROM ticketing_practice WHERE name = $1 AND stopwatch > 0 ORDER BY stopwatch ASC LIMIT 1',
      [name.trim()]
    );

    if (existing.rowCount > 0) {
      const row = existing.rows[0];
      return response.status(200).json({
        message: '기존 기록을 이어서 사용합니다.',
        id: row.id,
        name: name.trim(),
        stopwatch: row.stopwatch,
      });
    }

    const result = await pool.query(
      'INSERT INTO "ticketing_practice" (name, stopwatch) VALUES ($1, $2) RETURNING id',
      [name.trim(), 0]
    );

    const recordId = result.rows[0]?.id;
    return response.status(200).json({
      message: '티켓팅 연습 기록이 저장되었습니다.',
      id: recordId,
      name: name.trim(),
      stopwatch: 0,
    });
  } catch (error) {
    console.error('DB 에러:', error);
    return response.status(500).json({ error: error.message });
  }
}
