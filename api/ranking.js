import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: { rejectUnauthorized: false }
});

async function getRanking(request, response) {
  const { type, diff } = request.query;

  try {
    await pool.query(`
      DELETE FROM quiz_ranking
      WHERE created_at < DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
    `);

    let queryText = `
      SELECT
        rank() OVER (ORDER BY r.score DESC) AS rank,
        CASE
          WHEN LENGTH(r.name) > 2 THEN OVERLAY(r.name PLACING '*' FROM 2 FOR 1)
          WHEN LENGTH(r.name) = 2 THEN OVERLAY(r.name PLACING '*' FROM 2 FOR 1)
          ELSE r.name
        END AS name,
        r.score
      FROM "quiz_ranking" r
      JOIN "difficulty" d ON r.difficulty_id = d.id
      WHERE d.db_value = $1
    `;

    if (type === 'last') {
      queryText += ` AND r.created_at >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
                     AND r.created_at < DATE_TRUNC('month', CURRENT_DATE)`;
    } else {
      queryText += ` AND r.created_at >= DATE_TRUNC('month', CURRENT_DATE)`;
    }

    queryText += ` ORDER BY r.score DESC, r.created_at DESC LIMIT 10`;

    const result = await pool.query(queryText, [diff]);
    return response.status(200).json(result.rows);
  } catch (error) {
    return response.status(500).json({ error: error.message });
  }
}

async function postRanking(request, response) {
  try {
    const { name, score, difficulty } = typeof request.body === 'string'
      ? JSON.parse(request.body)
      : request.body;

    const diffRes = await pool.query('SELECT id FROM "difficulty" WHERE db_value = $1', [difficulty]);
    if (diffRes.rows.length === 0) {
      return response.status(400).json({ error: '올바르지 않은 난이도입니다.' });
    }
    const diffId = diffRes.rows[0].id;

    const checkUser = await pool.query(
      `SELECT id, score FROM "quiz_ranking"
       WHERE name = $1 AND difficulty_id = $2
       AND created_at >= DATE_TRUNC('month', CURRENT_DATE)`,
      [name, diffId]
    );

    if (checkUser.rows.length > 0) {
      if (score > checkUser.rows[0].score) {
        await pool.query(
          'UPDATE "quiz_ranking" SET score = $1, created_at = NOW() WHERE id = $2',
          [score, checkUser.rows[0].id]
        );
        return response.status(200).json({ message: `${difficulty} 모드 최고 기록 경신! ✨` });
      }
      return response.status(200).json({ message: '기존 점수가 더 높습니다. 기록이 유지됩니다. 🍒' });
    } else {
      await pool.query(
        'INSERT INTO "quiz_ranking" (name, score, difficulty_id, created_at) VALUES ($1, $2, $3, NOW())',
        [name, score, diffId]
      );
      return response.status(200).json({ message: '랭킹 등록 완료! 🏆' });
    }
  } catch (error) {
    console.error('DB 에러:', error);
    return response.status(500).json({ error: error.message });
  }
}

export default async function handler(request, response) {
  if (request.method === 'GET') return getRanking(request, response);
  if (request.method === 'POST') return postRanking(request, response);
  return response.status(405).send('Method Not Allowed');
}
