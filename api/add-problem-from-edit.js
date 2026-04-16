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
    const { question_text, answer, suggestionId } = typeof request.body === 'string'
      ? JSON.parse(request.body)
      : request.body;

    if (!question_text || !answer || !suggestionId) {
      return response.status(400).json({ error: '필수 입력값이 없습니다.' });
    }

    // 건의사항의 difficulty_id 조회
    const suggestionRes = await pool.query(
      'SELECT difficulty_id FROM "SuggestedQuestions" WHERE id = $1',
      [suggestionId]
    );

    if (suggestionRes.rows.length === 0) {
      return response.status(404).json({ error: '건의사항을 찾을 수 없습니다.' });
    }

    const diffId = suggestionRes.rows[0].difficulty_id;

    // 문제 추가
    await pool.query(
      'INSERT INTO "questions" (question_text, answer, difficulty_id) VALUES ($1, $2, $3)',
      [question_text, answer, diffId]
    );

    // 건의사항 상태 업데이트
    await pool.query(
      'UPDATE "SuggestedQuestions" SET status = $1 WHERE id = $2',
      ['approved', suggestionId]
    );

    return response.status(200).json({ message: '문제가 추가되었습니다.' });
  } catch (error) {
    console.error('Add problem from edit error:', error);
    return response.status(500).json({ error: error.message });
  }
}
