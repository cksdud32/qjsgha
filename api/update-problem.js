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
    const { problemId, question_text, answer } = typeof request.body === 'string'
      ? JSON.parse(request.body)
      : request.body;

    if (!problemId || !question_text || !answer) {
      return response.status(400).json({ error: '필수 입력값이 없습니다.' });
    }

    await pool.query(
      'UPDATE "questions" SET question_text = $1, answer = $2 WHERE id = $3',
      [question_text, answer, problemId]
    );

    return response.status(200).json({ message: '문제가 수정되었습니다.' });
  } catch (error) {
    console.error('Update problem error:', error);
    return response.status(500).json({ error: error.message });
  }
}
