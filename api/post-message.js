import pg from 'pg';
const { Pool } = pg;

// 5432 포트 주소를 그대로 써도 통과되도록 직접 설정합니다.
const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: {
    rejectUnauthorized: false // 이 설정이 5432 포트 보안 검사를 통과하게 해줍니다.
  }
});

export default async function handler(request, response) {
  if (request.method !== 'POST') return response.status(405).send('Method Not Allowed');

  try {
    const { name, content } = typeof request.body === 'string' ? JSON.parse(request.body) : request.body;

    // pg 라이브러리 방식으로 쿼리 실행
    const result = await pool.query(
      'INSERT INTO "messages" (name, content, created_at) VALUES ($1, $2, NOW())',
      [name, content]
    );

    return response.status(200).json({ message: "성공적으로 저장되었습니다! 🍒" });
  } catch (error) {
    console.error('DB 에러:', error);
    return response.status(500).json({ error: error.message });
  }
}