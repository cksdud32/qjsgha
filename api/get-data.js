import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: { rejectUnauthorized: false }
});

export default async function handler(request, response) {
  // 1. GET 요청만 허용 (보안 및 규격 확인)
  if (request.method !== 'GET') {
    return response.status(405).json({ error: 'Method Not Allowed' });
  }

  // 2. 파라미터 확인
  const { difficulty } = request.query;
  if (!difficulty) {
    return response.status(400).json({ error: '난이도 파라미터가 누락되었습니다.' });
  }

  try {
    /**
     * [주요 수정 사항]
     * - 테이블 이름을 프로젝트에서 사용 중인 'QuizQuestions'로 맞춤 (혹은 Questions 중 선택)
     * - ORDER BY RANDOM()을 사용하여 매번 다른 10문제를 추출
     * - 만약 Difficulty 테이블에 없는 값이 들어올 경우를 대비한 안전 장치
     */
    const queryText = `
      SELECT q.id, q.question_text, q.answer, d.time_limit
      FROM QuizQuestions q
      JOIN Difficulty d ON q.difficulty_id = d.id
      WHERE d.db_value = $1
      ORDER BY RANDOM()
      LIMIT 10
    `;

    const result = await pool.query(queryText, [difficulty]);

    // 3. 문제 데이터가 없는 경우 처리
    if (result.rows.length === 0) {
      return response.status(404).json({ 
        error: '해당 난이도의 문제를 찾을 수 없습니다. DB를 확인해주세요.' 
      });
    }

    // 4. 문제 리스트 반환
    return response.status(200).json(result.rows);

  } catch (error) {
    // 서버 로그에 에러 기록
    console.error('데이터 조회 중 서버 에러 발생:', error);
    return response.status(500).json({ 
      error: '데이터베이스 연결 오류가 발생했습니다.',
      details: error.message 
    });
  }
}