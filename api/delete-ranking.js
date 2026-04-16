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
    const { rankingId } = typeof request.body === 'string'
      ? JSON.parse(request.body)
      : request.body;

    if (!rankingId) {
      return response.status(400).json({ error: '랭킹 ID가 필요합니다.' });
    }

    await pool.query(
      'DELETE FROM "quiz_ranking" WHERE id = $1',
      [rankingId]
    );

    return response.status(200).json({ message: '랭킹이 삭제되었습니다.' });
  } catch (error) {
    console.error('Delete ranking error:', error);
    return response.status(500).json({ error: error.message });
  }
}
