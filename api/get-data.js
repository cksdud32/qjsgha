import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: { rejectUnauthorized: false }
});

export default async function handler(request, response) {
  // GET 요청만 허용
  if (request.method !== 'GET') return response.status(405).send('Method Not Allowed');

  // URL 파라미터에서 난이도 값을 가져옵니다.
  const { difficulty } = request.query;

  if (!difficulty) {
    return response.status(400).json({ error: '난이도를 선택해주세요.' });
  }

  try {
    /**
     * [쿼리 설명]
     * 1. Questions(q)와 Difficulty(d) 테이블을 조인합니다.
     * 2. 사용자가 선택한 난이도(db_value)와 일치하는 행만 필터링합니다.
     * 3. RANDOM()으로 섞어서 중복 문제를 방지하고 10개만 가져옵니다.
     */
    const queryText = `
      SELECT q.id, q.question_text, q.answer, d.time_limit
      FROM Questions q
      JOIN Difficulty d ON q.difficulty_id = d.id
      WHERE d.db_value = $1
      ORDER BY RANDOM()
      LIMIT 10
    `;

    const result = await pool.query(queryText, [difficulty]);

    // 문제 리스트를 JSON으로 반환
    return response.status(200).json(result.rows);
  } catch (error) {
    console.error('DB 에러:', error);
    return response.status(500).json({ error: error.message });
  }
}