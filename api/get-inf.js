import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: { rejectUnauthorized: false }
});

const CHOSUNG = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
const SONG_TYPE_ORDER = { '오리지널 곡': 0, '한국 커버곡': 1, '일본 커버곡1': 2, '일본 커버곡2': 3 };

function titleSortKey(title) {
  const ch = (title || '')[0] || '';
  if (/\d/.test(ch)) return '0_' + title;
  if (/[A-Za-z]/.test(ch)) return '1_' + ch.toLowerCase() + '_' + title.toLowerCase();
  const code = ch.charCodeAt(0);
  if (code >= 0xAC00 && code <= 0xD7A3) {
    const idx = Math.floor((code - 0xAC00) / 28 / 21);
    return '2_' + String(idx).padStart(2, '0') + '_' + title;
  }
  return '3_' + title;
}

export function sortSongs(songs) {
  return songs.slice().sort((a, b) => {
    const tA = SONG_TYPE_ORDER[a.song_type] ?? 99;
    const tB = SONG_TYPE_ORDER[b.song_type] ?? 99;
    if (tA !== tB) return tA - tB;
    return titleSortKey(a.song_title).localeCompare(titleSortKey(b.song_title), 'ko');
  });
}

export default async function handler(request, response) {
  if (request.method !== 'GET') return response.status(405).send('Method Not Allowed');

  if (request.query.section === 'karaoke') {
    try {
      const result = await pool.query(
        'SELECT song_title, song_type, number1, number2, lyrics_key1, lyrics_label, lyrics_label2, link_url, link_label, link_url2, link_label2 FROM karaoke_number'
      );
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

    const configMap = {};
    config.rows.forEach(row => { configMap[row.key] = row.value; });

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
