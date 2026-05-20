import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: { rejectUnauthorized: false }
});

export default async function handler(request, response) {
  if (request.method !== 'GET') return response.status(405).send('Method Not Allowed');

  try {
    const [concerts, goods, notices] = await Promise.all([
      pool.query('SELECT * FROM concert ORDER BY id'),
      pool.query('SELECT * FROM goods ORDER BY id'),
      pool.query('SELECT * FROM notice ORDER BY id')
    ]);

    return response.status(200).json({
      concerts: concerts.rows,
      goods: goods.rows,
      notices: notices.rows
    });
  } catch (error) {
    console.error('DB 에러:', error);
    return response.status(500).json({
      error: '데이터를 가져오는 중 오류가 발생했습니다.',
      details: error.message
    });
  }
}
