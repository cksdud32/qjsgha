import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: { rejectUnauthorized: false }
});

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { question_text, answer, difficulty } = typeof request.body === 'string'
      ? JSON.parse(request.body)
      : request.body;

    if (!question_text || !answer || !difficulty) {
      return response.status(400).json({ error: '필수 입력값이 없습니다.' });
    }

    // 난이도 ID 조회
    const diffRes = await pool.query(
      'SELECT id FROM "difficulty" WHERE db_value = $1',
      [difficulty]
    );

    if (diffRes.rows.length === 0) {
      return response.status(400).json({ error: '올바르지 않은 난이도입니다.' });
    }

    const diffId = diffRes.rows[0].id;

    // 문제 추가
    await pool.query(
      'INSERT INTO "questions" (question_text, answer, difficulty_id) VALUES ($1, $2, $3)',
      [question_text, answer, diffId]
    );

    return response.status(200).json({ message: '문제가 추가되었습니다.' });
  } catch (error) {
    console.error('Add problem error:', error);
    return response.status(500).json({ error: error.message });
  }
}
