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
    const { id, stopwatch } = body;

    const parsedId = Number(id);
    const parsedStopwatch = Number(stopwatch);

    if (!Number.isInteger(parsedId) || parsedId <= 0) {
      return response.status(400).json({ error: '올바른 레코드 ID를 전달해주세요.' });
    }
    if (!Number.isFinite(parsedStopwatch) || parsedStopwatch < 0) {
      return response.status(400).json({ error: '올바른 stopwatch 값을 전달해주세요.' });
    }

    const updateResult = await pool.query(
      'UPDATE "ticketing_practice" SET stopwatch = $1 WHERE id = $2 RETURNING id',
      [parsedStopwatch, parsedId]
    );

    if (updateResult.rowCount === 0) {
      return response.status(404).json({ error: '해당 기록을 찾을 수 없습니다.' });
    }

    return response.status(200).json({ message: '기록이 업데이트되었습니다.', id: parsedId, stopwatch: parsedStopwatch });
  } catch (error) {
    console.error('DB 에러:', error);
    return response.status(500).json({ error: error.message });
  }
}
