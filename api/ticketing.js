import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: { rejectUnauthorized: false }
});

function maskName(name) {
  if (!name) return '*';
  if (name.length === 1) return name;
  if (name.length === 2) return name[0] + '*';
  return name[0] + '*'.repeat(name.length - 2) + name[name.length - 1];
}

function parseBody(request) {
  return typeof request.body === 'string' ? JSON.parse(request.body) : request.body;
}

async function cleanupExpired() {
  await pool.query(
    "DELETE FROM ticketing_practice WHERE stopwatch = 0 AND updated_at < NOW() - INTERVAL '200 seconds'"
  );
}

async function getRecords(request, response) {
  await cleanupExpired();
  const result = await pool.query(
    'SELECT id, name, stopwatch FROM "ticketing_practice" ORDER BY id DESC LIMIT 50'
  );
  return response.status(200).json({ records: result.rows });
}

async function getLeaderboard(request, response) {
  await pool.query(`
    DELETE FROM ticketing_practice
    WHERE updated_at < DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
  `);

  const result = await pool.query(`
    SELECT name, stopwatch,
           RANK() OVER (ORDER BY stopwatch ASC) AS rank
    FROM ticketing_practice
    WHERE stopwatch > 0
    ORDER BY stopwatch ASC
    LIMIT 10
  `);

  const leaderboard = result.rows.map(r => ({
    rank:      Number(r.rank),
    name:      maskName(r.name),
    stopwatch: Number(r.stopwatch),
  }));

  const myStopwatch = request.query.myStopwatch ? Number(request.query.myStopwatch) : null;
  if (myStopwatch && myStopwatch > 0 && !leaderboard.some(r => r.stopwatch === myStopwatch)) {
    const myResult = await pool.query(`
      WITH ranked AS (
        SELECT name, stopwatch,
               RANK() OVER (ORDER BY stopwatch ASC) AS rank
        FROM ticketing_practice
        WHERE stopwatch > 0
      )
      SELECT * FROM ranked WHERE stopwatch = $1 LIMIT 1
    `, [myStopwatch]);

    if (myResult.rows.length > 0) {
      const r = myResult.rows[0];
      leaderboard.push({ rank: Number(r.rank), name: maskName(r.name), stopwatch: Number(r.stopwatch) });
    }
  }

  return response.status(200).json({ leaderboard });
}

async function createRecord(request, response) {
  const { name, stopwatch } = parseBody(request);

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return response.status(400).json({ error: '닉네임을 입력해주세요.' });
  }
  const parsedStopwatch = Number(stopwatch);
  if (!Number.isFinite(parsedStopwatch) || parsedStopwatch < 0) {
    return response.status(400).json({ error: '올바른 stopwatch 값을 전달해주세요.' });
  }

  await cleanupExpired();

  const existing = await pool.query(
    'SELECT id, stopwatch FROM ticketing_practice WHERE name = $1 AND stopwatch > 0 ORDER BY stopwatch ASC LIMIT 1',
    [name.trim()]
  );
  if (existing.rowCount > 0) {
    const row = existing.rows[0];
    return response.status(200).json({ message: '기존 기록을 이어서 사용합니다.', id: row.id, name: name.trim(), stopwatch: row.stopwatch });
  }

  const result = await pool.query(
    'INSERT INTO "ticketing_practice" (name, stopwatch) VALUES ($1, $2) RETURNING id',
    [name.trim(), 0]
  );
  return response.status(200).json({ message: '티켓팅 연습 기록이 저장되었습니다.', id: result.rows[0]?.id, name: name.trim(), stopwatch: 0 });
}

async function updateRecord(request, response) {
  const { id, stopwatch } = parseBody(request);
  const parsedId = Number(id);
  const parsedStopwatch = Number(stopwatch);

  if (!Number.isInteger(parsedId) || parsedId <= 0) {
    return response.status(400).json({ error: '올바른 레코드 ID를 전달해주세요.' });
  }
  if (!Number.isFinite(parsedStopwatch) || parsedStopwatch < 0) {
    return response.status(400).json({ error: '올바른 stopwatch 값을 전달해주세요.' });
  }
  if (parsedStopwatch > 0 && parsedStopwatch < 2000) {
    return response.status(400).json({ error: '유효하지 않은 기록입니다.' });
  }

  await cleanupExpired();

  const currentResult = await pool.query(
    'SELECT name, stopwatch FROM ticketing_practice WHERE id = $1',
    [parsedId]
  );
  if (currentResult.rowCount === 0) {
    return response.status(404).json({ error: '해당 기록을 찾을 수 없습니다.' });
  }

  const currentStopwatch = Number(currentResult.rows[0].stopwatch);
  if (currentStopwatch === 0 || parsedStopwatch < currentStopwatch) {
    await pool.query('UPDATE ticketing_practice SET stopwatch = $1 WHERE id = $2', [parsedStopwatch, parsedId]);
    return response.status(200).json({
      kept: 'new',
      message: currentStopwatch === 0 ? '기록이 저장되었습니다.' : '기록이 갱신되었습니다!',
      id: parsedId,
      stopwatch: parsedStopwatch,
      oldStopwatch: currentStopwatch || null,
    });
  }

  return response.status(200).json({ kept: 'old', message: '이전 기록이 더 빠릅니다.', oldStopwatch: currentStopwatch, newStopwatch: parsedStopwatch });
}

export default async function handler(request, response) {
  try {
    if (request.method === 'GET') {
      return request.query.type === 'leaderboard'
        ? getLeaderboard(request, response)
        : getRecords(request, response);
    }
    if (request.method === 'POST') {
      const body = parseBody(request);
      return body.action === 'update'
        ? updateRecord(request, response)
        : createRecord(request, response);
    }
    return response.status(405).send('Method Not Allowed');
  } catch (error) {
    console.error('DB 에러:', error);
    return response.status(500).json({ error: error.message });
  }
}
