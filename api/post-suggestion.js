import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

export default async function handler(request, response) {
  if (request.method !== 'POST') return response.status(405).send('Method Not Allowed');

  try {
    // 프론트엔드에서 보낸 데이터 받기
    const { name, question_text, answer, answer2, answer3, difficulty } = typeof request.body === 'string' ? JSON.parse(request.body) : request.body;

    // 1. 난이도 db_value를 이용해 ID 찾아오기
    const diffRes = await pool.query('SELECT id FROM "difficulty" WHERE db_value = $1', [difficulty]);
    if (diffRes.rows.length === 0) {
      return response.status(400).json({ error: "올바른 난이도를 선택해주세요." });
    }
    const diffId = diffRes.rows[0].id;

    // 2. SuggestedQuestions 테이블에 저장 (status는 DEFAULT 설정 덕분에 자동 입력됨)
    const queryText = `
      INSERT INTO "SuggestedQuestions" (name, question_text, answer, question_text2, question_text3, difficulty_id)
      VALUES ($1, $2, $3, $4, $5, $6)
    `;
    await pool.query(queryText, [name, question_text, answer, answer2 || null, answer3 || null, diffId]);

    return response.status(200).json({ message: "성공적으로 건의되었습니다! 관리자 확인 후 추가됩니다. 🍒" });

  } catch (error) {
    console.error('DB 에러:', error);
    return response.status(500).json({ error: error.message });
  }
}