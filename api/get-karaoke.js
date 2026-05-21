import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: { rejectUnauthorized: false }
});

export default async function handler(request, response) {
  try {
    const result = await pool.query(
      'SELECT song_title, song_type, number1, number2, lyrics_key1, link_url, link_label, link_url2, link_label2 FROM karaoke_number ORDER BY id'
    );
    return response.status(200).json(result.rows);
  } catch (error) {
    console.error('get-karaoke error:', error);
    return response.status(500).json({ error: error.message });
  }
}
