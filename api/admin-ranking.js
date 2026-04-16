import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: { rejectUnauthorized: false }
});

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    return response.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { difficulty } = request.query;

    if (!difficulty) {
      return response.status(400).json({ error: '난이도 파라미터가 필요합니다.' });
    }

    const result = await pool.query(
      `SELECT r.id, r.name, r.score, r.created_at
       FROM "quiz_ranking" r
       JOIN "difficulty" d ON r.difficulty_id = d.id
       WHERE d.db_value = $1
       ORDER BY r.score DESC, r.created_at DESC`,
      [difficulty]
    );

    return response.status(200).json(result.rows);
  } catch (error) {
    console.error('Get admin ranking error:', error);
    return response.status(500).json({ error: error.message });
  }
}
