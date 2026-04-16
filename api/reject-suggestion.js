import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: { rejectUnauthorized: false }
});

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { suggestionId } = typeof request.body === 'string'
      ? JSON.parse(request.body)
      : request.body;

    if (!suggestionId) {
      return response.status(400).json({ error: '건의사항 ID가 필요합니다.' });
    }

    await pool.query(
      'UPDATE "SuggestedQuestions" SET status = $1 WHERE id = $2',
      ['rejected', suggestionId]
    );

    return response.status(200).json({ message: '건의사항이 기각되었습니다.' });
  } catch (error) {
    console.error('Reject suggestion error:', error);
    return response.status(500).json({ error: error.message });
  }
}
