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
    const { suggestionId } = typeof request.body === 'string'
      ? JSON.parse(request.body)
      : request.body;

    if (!suggestionId) {
      return response.status(400).json({ error: '건의사항 ID가 필요합니다.' });
    }

    // 건의사항 조회
    const suggestionRes = await pool.query(
      'SELECT question_text, answer, difficulty_id FROM "SuggestedQuestions" WHERE id = $1',
      [suggestionId]
    );

    if (suggestionRes.rows.length === 0) {
      return response.status(404).json({ error: '건의사항을 찾을 수 없습니다.' });
    }

    const suggestion = suggestionRes.rows[0];

    // 문제 추가
    await pool.query(
      'INSERT INTO "questions" (question_text, answer, difficulty_id) VALUES ($1, $2, $3)',
      [suggestion.question_text, suggestion.answer, suggestion.difficulty_id]
    );

    // 건의사항 상태 업데이트
    await pool.query(
      'UPDATE "SuggestedQuestions" SET status = $1 WHERE id = $2',
      ['approved', suggestionId]
    );

    return response.status(200).json({ message: '건의사항이 승인되었습니다.' });
  } catch (error) {
    console.error('Approve suggestion error:', error);
    return response.status(500).json({ error: error.message });
  }
}
