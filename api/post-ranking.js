import pg from 'pg';
const { Pool } = pg;

// 찬영님이 사용하시는 pg 라이브러리 설정 방식입니다.
const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

export default async function handler(request, response) {
  // POST 요청만 허용
  if (request.method !== 'POST') return response.status(405).send('Method Not Allowed');

  try {
    // 요청 바디 파싱
    const { name, score, difficulty } = typeof request.body === 'string' ? JSON.parse(request.body) : request.body;

    // 1. 난이도(db_value)를 이용해 difficulty 테이블에서 해당 ID를 가져옵니다.
    const diffRes = await pool.query('SELECT id FROM "difficulty" WHERE db_value = $1', [difficulty]);
    if (diffRes.rows.length === 0) {
      return response.status(400).json({ error: "올바르지 않은 난이도입니다." });
    }
    const diffId = diffRes.rows[0].id;

    // 2. 이번 달에 같은 닉네임으로 등록된 기록이 있는지 확인합니다.
    const checkUser = await pool.query(
      `SELECT id, score FROM "quiz_ranking" 
       WHERE name = $1 AND created_at >= DATE_TRUNC('month', CURRENT_DATE)`,
      [name]
    );

    if (checkUser.rows.length > 0) {
      // 3. 기록이 있다면: 현재 점수가 기존 점수보다 높을 때만 업데이트합니다.
      if (score > checkUser.rows[0].score) {
        await pool.query(
          'UPDATE "quiz_ranking" SET score = $1, difficulty_id = $2, created_at = NOW() WHERE id = $3',
          [score, diffId, checkUser.rows[0].id]
        );
        return response.status(200).json({ message: "최고 기록 경신! ✨" });
      }
      return response.status(200).json({ message: "기존 점수가 더 높습니다. 기록이 유지됩니다. 🍒" });
      
    } else {
      // 4. 기록이 없다면: 새로운 랭킹 데이터를 삽입합니다.
      await pool.query(
        'INSERT INTO "quiz_ranking" (name, score, difficulty_id, created_at) VALUES ($1, $2, $3, NOW())',
        [name, score, diffId]
      );
      return response.status(200).json({ message: "랭킹 등록 완료! 🏆" });
    }

  } catch (error) {
    console.error('DB 에러:', error);
    return response.status(500).json({ error: error.message });
  }
}