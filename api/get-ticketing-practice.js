import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    return response.status(405).send('Method Not Allowed');
  }

  try {
    await pool.query(
      "DELETE FROM ticketing_practice WHERE stopwatch = 0 AND updated_at < NOW() - INTERVAL '30 seconds'"
    );

    const result = await pool.query(
      'SELECT id, name, stopwatch FROM "ticketing_practice" ORDER BY id DESC LIMIT 50'
    );
    return response.status(200).json({ records: result.rows });
  } catch (error) {
    console.error('DB 에러:', error);
    return response.status(500).json({ error: error.message });
  }
}
