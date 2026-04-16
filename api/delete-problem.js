import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: { rejectUnauthorized: false }
});

export default async function handler(request, response) {
  if (request.method !== 'DELETE') {
    return response.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { problemId } = typeof request.body === 'string'
      ? JSON.parse(request.body)
      : request.body;

    if (!problemId) {
      return response.status(400).json({ error: '문제 ID가 필요합니다.' });
    }

    await pool.query(
      'DELETE FROM "questions" WHERE id = $1',
      [problemId]
    );

    return response.status(200).json({ message: '문제가 삭제되었습니다.' });
  } catch (error) {
    console.error('Delete problem error:', error);
    return response.status(500).json({ error: error.message });
  }
}
