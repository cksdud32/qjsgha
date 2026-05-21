import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: { rejectUnauthorized: false }
});

export default async function handler(request, response) {
  if (request.method === 'GET') {
    const { difficulty } = request.query;
    if (!difficulty) return response.status(400).json({ error: '난이도 파라미터가 필요합니다.' });

    try {
      const result = await pool.query(`
        SELECT q.id, q.question_text, q.answer, q.question_text2, q.question_text3, d.time_limit
        FROM "questions" q
        JOIN "difficulty" d ON q.difficulty_id = d.id
        WHERE d.db_value = $1
        ORDER BY RANDOM()
        LIMIT 15
      `, [difficulty]);

      if (result.rows.length === 0) return response.status(404).json({ error: '해당 난이도의 문제가 존재하지 않습니다.' });
      return response.status(200).json(result.rows);
    } catch (error) {
      return response.status(500).json({ error: '데이터를 가져오는 중 오류가 발생했습니다.', details: error.message });
    }
  }

  if (request.method === 'POST') {
    try {
      const { name, question_text, answer, answer2, answer3, difficulty } =
        typeof request.body === 'string' ? JSON.parse(request.body) : request.body;

      const diffRes = await pool.query('SELECT id FROM "difficulty" WHERE db_value = $1', [difficulty]);
      if (diffRes.rows.length === 0) return response.status(400).json({ error: '올바른 난이도를 선택해주세요.' });

      await pool.query(`
        INSERT INTO "SuggestedQuestions" (name, question_text, answer, question_text2, question_text3, difficulty_id)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [name, question_text, answer, answer2 || null, answer3 || null, diffRes.rows[0].id]);

      return response.status(200).json({ message: '성공적으로 건의되었습니다! 관리자 확인 후 추가됩니다. 🍒' });
    } catch (error) {
      return response.status(500).json({ error: error.message });
    }
  }

  return response.status(405).send('Method Not Allowed');
}
