import pg from 'pg';
import { sortSongs } from '../lib/songUtils.js';

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: { rejectUnauthorized: false }
});

export default async function handler(request, response) {
  if (request.method !== 'GET') return response.status(405).send('Method Not Allowed');

  if (request.query.section === 'karaoke') {
    try {
      const result = await pool.query(
        'SELECT song_title, song_type, number1, number2, lyrics_key1, lyrics_label, lyrics_label2, link_url, link_label, link_url2, link_label2 FROM karaoke_number'
      );
      response.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
      return response.status(200).json(sortSongs(result.rows));
    } catch (error) {
      return response.status(500).json({ error: error.message });
    }
  }

  try {
    const [concerts, goods, notices, config, waitingGroups] = await Promise.all([
      pool.query('SELECT * FROM concert ORDER BY id'),
      pool.query('SELECT * FROM goods ORDER BY id'),
      pool.query('SELECT * FROM notice ORDER BY id'),
      pool.query('SELECT * FROM site_config'),
      pool.query('SELECT * FROM waiting_group ORDER BY sort_order, id')
    ]);

    const configMap = Object.fromEntries(config.rows.map(r => [r.key, r.value]));

    return response.status(200).json({
      concerts: concerts.rows,
      goods: goods.rows,
      notices: notices.rows,
      config: configMap,
      waiting_groups: waitingGroups.rows
    });
  } catch (error) {
    console.error('DB 에러:', error);
    return response.status(500).json({
      error: '데이터를 가져오는 중 오류가 발생했습니다.',
      details: error.message
    });
  }
}
