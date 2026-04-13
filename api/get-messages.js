import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: { rejectUnauthorized: false }
});

export default async function handler(request, response) {
  // GET 요청만 허용
  if (request.method !== 'GET') return response.status(405).send('Method Not Allowed');

  try {
    // 최신순으로 50개만 가져오기
    const result = await pool.query(
      'SELECT * FROM "messages" ORDER BY created_at DESC LIMIT 50'
    );

    return response.status(200).json(result.rows);
  } catch (error) {
    console.error('DB 에러:', error);
    return response.status(500).json({ error: error.message });
  }
}