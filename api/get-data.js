import pg from 'pg';
const { Pool } = pg;

// 찬영님의 DB 연결 설정 방식 유지
const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

export default async function handler(request, response) {
  // GET 요청만 허용
  if (request.method !== 'GET') return response.status(405).send('Method Not Allowed');

  const { difficulty } = request.query;

  if (!difficulty) {
    return response.status(400).json({ error: '난이도 파라미터가 필요합니다.' });
  }

  try {
    /**
     * [쿼리 설명]
     * 1. questions(q) 테이블과 difficulty(d) 테이블을 조인합니다.
     * 2. 사용자가 선택한 난이도(db_value)와 일치하는 행을 찾습니다.
     * 3. ORDER BY RANDOM()으로 무작위 섞기 후 10개만 가져옵니다.
     * ※ 에러 방지를 위해 테이블 이름에 큰따옴표를 추가했습니다.
     */
    const queryText = `
      SELECT q.id, q.question_text, q.answer, q.question_text2, q.question_text3, d.time_limit
      FROM "questions" q
      JOIN "difficulty" d ON q.difficulty_id = d.id
      WHERE d.db_value = $1
      ORDER BY RANDOM()
      LIMIT 15
    `;

    const result = await pool.query(queryText, [difficulty]);

    // 문제 데이터가 없는 경우 예외 처리
    if (result.rows.length === 0) {
      return response.status(404).json({ error: '해당 난이도의 문제가 존재하지 않습니다.' });
    }

    // 결과 반환
    return response.status(200).json(result.rows);

  } catch (error) {
    console.error('DB 에러:', error);
    // 에러 발생 시 상세 원인을 JSON으로 반환하여 디버깅을 돕습니다.
    return response.status(500).json({ 
      error: '데이터를 가져오는 중 오류가 발생했습니다.', 
      details: error.message 
    });
  }
}