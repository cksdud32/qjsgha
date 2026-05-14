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

    await pool.query(
      "DELETE FROM ticketing_practice WHERE stopwatch = 0 AND updated_at < NOW() - INTERVAL '200 seconds'"
    );

    // 현재 레코드에서 name 가져오기
    const currentResult = await pool.query(
      'SELECT name, stopwatch FROM ticketing_practice WHERE id = $1',
      [parsedId]
    );

    if (currentResult.rowCount === 0) {
      return response.status(404).json({ error: '해당 기록을 찾을 수 없습니다.' });
    }

    const currentStopwatch = Number(currentResult.rows[0].stopwatch);

    // 첫 기록이거나 새 기록이 더 빠를 때만 업데이트
    if (currentStopwatch === 0 || parsedStopwatch < currentStopwatch) {
      await pool.query(
        'UPDATE ticketing_practice SET stopwatch = $1 WHERE id = $2',
        [parsedStopwatch, parsedId]
      );
      return response.status(200).json({
        kept: 'new',
        message: currentStopwatch === 0 ? '기록이 저장되었습니다.' : '기록이 갱신되었습니다!',
        id: parsedId,
        stopwatch: parsedStopwatch,
        oldStopwatch: currentStopwatch || null,
      });
    } else {
      // 기존 기록이 더 빠름 → 그대로 유지
      return response.status(200).json({
        kept: 'old',
        message: '이전 기록이 더 빠릅니다.',
        oldStopwatch: currentStopwatch,
        newStopwatch: parsedStopwatch,
      });
    }
  } catch (error) {
    console.error('DB 에러:', error);
    return response.status(500).json({ error: error.message });
  }
}
