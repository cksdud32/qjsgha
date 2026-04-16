import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: { rejectUnauthorized: false }
});

export default async function handler(request, response) {
  const { type, diff } = request.query; 

  try {
    // 1. 전전달 기록 삭제 (조회 시 자동 관리)
    await pool.query(`
      DELETE FROM quiz_ranking 
      WHERE created_at < DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
    `);

    // 2. 난이도 및 기간별 조회 쿼리
    // 이름의 두 번째 글자부터 1글자를 '*'로 대체 (예: 홍길동 -> 홍*동)
    let queryText = `
      SELECT 
        rank() OVER (ORDER BY r.score DESC, r.created_at DESC) AS rank,
        CASE 
          WHEN LENGTH(r.name) > 2 THEN 
            OVERLAY(r.name PLACING '*' FROM 2 FOR 1)
          WHEN LENGTH(r.name) = 2 THEN 
            OVERLAY(r.name PLACING '*' FROM 2 FOR 1)
          ELSE r.name 
        END AS name, 
        r.score 
      FROM "quiz_ranking" r
      JOIN "difficulty" d ON r.difficulty_id = d.id
      WHERE d.db_value = $1
    `;

    if (type === 'last') {
      queryText += ` AND r.created_at >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
                     AND r.created_at < DATE_TRUNC('month', CURRENT_DATE)`;
    } else {
      queryText += ` AND r.created_at >= DATE_TRUNC('month', CURRENT_DATE)`;
    }

    queryText += ` ORDER BY r.score DESC, r.created_at DESC LIMIT 10`;

    const result = await pool.query(queryText, [diff]);
    return response.status(200).json(result.rows);
  } catch (error) {
    return response.status(500).json({ error: error.message });
  }
}