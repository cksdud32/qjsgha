import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: { rejectUnauthorized: false }
});

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    return response.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const result = await pool.query(
      `SELECT s.id, s.name, s.question_text, s.answer, d.db_value
       FROM "SuggestedQuestions" s
       JOIN "difficulty" d ON s.difficulty_id = d.id
       WHERE s.status = 'pending'
       ORDER BY s.created_at DESC`
    );

    return response.status(200).json(result.rows);
  } catch (error) {
    console.error('Get suggested problems error:', error);
    return response.status(500).json({ error: error.message });
  }
}
