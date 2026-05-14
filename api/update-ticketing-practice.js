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
      'SELECT name FROM ticketing_practice WHERE id = $1',
      [parsedId]
    );

    if (currentResult.rowCount === 0) {
      return response.status(404).json({ error: '해당 기록을 찾을 수 없습니다.' });
    }

    const name = currentResult.rows[0].name;

    // 같은 닉네임의 기존 완료 기록 조회 (현재 id 제외, stopwatch > 0)
    const existingResult = await pool.query(
      'SELECT id, stopwatch FROM ticketing_practice WHERE name = $1 AND id != $2 AND stopwatch > 0 ORDER BY stopwatch ASC',
      [name, parsedId]
    );

    const bestExisting = existingResult.rows[0];

    if (bestExisting && bestExisting.stopwatch < parsedStopwatch) {
      // 기존 기록이 더 빠름 → 현재(새) 기록 삭제, 기존 최고 기록 외 나머지도 정리
      await pool.query('DELETE FROM ticketing_practice WHERE id = $1', [parsedId]);
      if (existingResult.rows.length > 1) {
        await pool.query(
          'DELETE FROM ticketing_practice WHERE name = $1 AND id != $2',
          [name, bestExisting.id]
        );
      }
      return response.status(200).json({
        kept: 'old',
        message: '이전 기록이 더 빠릅니다.',
        oldStopwatch: bestExisting.stopwatch,
        newStopwatch: parsedStopwatch,
      });
    } else {
      // 새 기록이 더 빠름(또는 첫 기록) → 현재 기록 업데이트, 기존 기록 삭제
      await pool.query(
        'UPDATE ticketing_practice SET stopwatch = $1 WHERE id = $2',
        [parsedStopwatch, parsedId]
      );
      if (existingResult.rows.length > 0) {
        await pool.query(
          'DELETE FROM ticketing_practice WHERE name = $1 AND id != $2',
          [name, parsedId]
        );
      }
      return response.status(200).json({
        kept: 'new',
        message: bestExisting ? '기록이 갱신되었습니다!' : '기록이 저장되었습니다.',
        id: parsedId,
        stopwatch: parsedStopwatch,
        oldStopwatch: bestExisting ? bestExisting.stopwatch : null,
      });
    }
  } catch (error) {
    console.error('DB 에러:', error);
    return response.status(500).json({ error: error.message });
  }
}
