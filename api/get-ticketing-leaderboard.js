import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: { rejectUnauthorized: false }
});

function maskName(name) {
  if (!name) return '*';
  if (name.length === 1) return name;
  if (name.length === 2) return name[0] + '*';
  return name[0] + '*'.repeat(name.length - 2) + name[name.length - 1];
}

export default async function handler(request, response) {
  if (request.method !== 'GET') return response.status(405).send('Method Not Allowed');

  try {
    await pool.query(`
      DELETE FROM ticketing_practice
      WHERE updated_at < DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
    `);

    const result = await pool.query(`
      SELECT name, stopwatch,
             RANK() OVER (ORDER BY stopwatch ASC) AS rank
      FROM ticketing_practice
      WHERE stopwatch > 0
      ORDER BY stopwatch ASC
      LIMIT 10
    `);

    const leaderboard = result.rows.map(r => ({
      rank:      Number(r.rank),
      name:      maskName(r.name),
      stopwatch: Number(r.stopwatch),
    }));

    const myStopwatch = request.query.myStopwatch ? Number(request.query.myStopwatch) : null;

    if (myStopwatch && myStopwatch > 0) {
      const inTop10 = leaderboard.some(r => r.stopwatch === myStopwatch);
      if (!inTop10) {
        const myResult = await pool.query(`
          WITH ranked AS (
            SELECT name, stopwatch,
                   RANK() OVER (ORDER BY stopwatch ASC) AS rank
            FROM ticketing_practice
            WHERE stopwatch > 0
          )
          SELECT * FROM ranked WHERE stopwatch = $1 LIMIT 1
        `, [myStopwatch]);

        if (myResult.rows.length > 0) {
          const r = myResult.rows[0];
          leaderboard.push({
            rank:      Number(r.rank),
            name:      maskName(r.name),
            stopwatch: Number(r.stopwatch),
          });
        }
      }
    }

    return response.status(200).json({ leaderboard });
  } catch (error) {
    return response.status(500).json({ error: error.message });
  }
}
