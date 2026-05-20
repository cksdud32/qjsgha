import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: { rejectUnauthorized: false }
});

async function validateAuth(username, password) {
  if (!username || !password) return false;
  const res = await pool.query(
    'SELECT id FROM "AdminUsers" WHERE username = $1 AND password = $2',
    [username, password]
  );
  return res.rows.length > 0;
}

async function getAll(res) {
  const [concerts, goods, notices, config, waitingGroups] = await Promise.all([
    pool.query('SELECT * FROM concert ORDER BY id'),
    pool.query('SELECT * FROM goods ORDER BY id'),
    pool.query('SELECT * FROM notice ORDER BY id'),
    pool.query('SELECT * FROM site_config'),
    pool.query('SELECT * FROM waiting_group ORDER BY sort_order, id')
  ]);
  const configMap = {};
  config.rows.forEach(r => { configMap[r.key] = r.value; });
  return res.status(200).json({
    concerts: concerts.rows,
    goods: goods.rows,
    notices: notices.rows,
    config: configMap,
    waiting_groups: waitingGroups.rows
  });
}

// ── Waiting Group ─────────────────────────────────
async function addWaiting(body, res) {
  const { concert_ref, group_name, wait_start, entry_start, sort_order } = body;
  await pool.query(
    `INSERT INTO waiting_group (concert_ref,group_name,wait_start,entry_start,sort_order)
     VALUES ($1,$2,$3,$4,$5)`,
    [concert_ref||null, group_name, wait_start||null, entry_start||null, sort_order||0]
  );
  return res.status(200).json({ success: true });
}

async function updateWaiting(body, res) {
  const { id, concert_ref, group_name, wait_start, entry_start, sort_order } = body;
  await pool.query(
    `UPDATE waiting_group SET concert_ref=$1,group_name=$2,wait_start=$3,entry_start=$4,sort_order=$5
     WHERE id=$6`,
    [concert_ref||null, group_name, wait_start||null, entry_start||null, sort_order||0, id]
  );
  return res.status(200).json({ success: true });
}

async function deleteWaiting(body, res) {
  await pool.query('DELETE FROM waiting_group WHERE id=$1', [body.id]);
  return res.status(200).json({ success: true });
}

// ── Concert ──────────────────────────────────────
async function addConcert(body, res) {
  const { name, date_label, status, ticket_price, delivery_fee, ticketing_info,
          waiting_time, entry_wait_time, run_time, goods_sale_time,
          location_url, dress_code, setlist_url, extra_info_url } = body;
  await pool.query(
    `INSERT INTO concert
     (name,date_label,status,ticket_price,delivery_fee,ticketing_info,
      waiting_time,entry_wait_time,run_time,goods_sale_time,
      location_url,dress_code,setlist_url,extra_info_url)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
    [name, date_label||null, status||null, ticket_price||null, delivery_fee||null,
     ticketing_info||null, waiting_time||null, entry_wait_time||null,
     run_time||null, goods_sale_time||null,
     location_url||null, dress_code||null, setlist_url||null, extra_info_url||null]
  );
  return res.status(200).json({ success: true });
}

async function updateConcert(body, res) {
  const { id, name, date_label, status, ticket_price, delivery_fee, ticketing_info,
          waiting_time, entry_wait_time, run_time, goods_sale_time,
          location_url, dress_code, setlist_url, extra_info_url } = body;
  await pool.query(
    `UPDATE concert SET
     name=$1,date_label=$2,status=$3,ticket_price=$4,delivery_fee=$5,
     ticketing_info=$6,waiting_time=$7,entry_wait_time=$8,run_time=$9,
     goods_sale_time=$10,location_url=$11,dress_code=$12,setlist_url=$13,extra_info_url=$14
     WHERE id=$15`,
    [name, date_label||null, status||null, ticket_price||null, delivery_fee||null,
     ticketing_info||null, waiting_time||null, entry_wait_time||null,
     run_time||null, goods_sale_time||null,
     location_url||null, dress_code||null, setlist_url||null, extra_info_url||null, id]
  );
  return res.status(200).json({ success: true });
}

async function deleteConcert(body, res) {
  await pool.query('DELETE FROM concert WHERE id=$1', [body.id]);
  return res.status(200).json({ success: true });
}

// ── Goods ─────────────────────────────────────────
async function addGoods(body, res) {
  const { goods_name, concert_ref, price, quantity_info, detail, group_name, is_random, price_data } = body;
  await pool.query(
    `INSERT INTO goods (goods_name,concert_ref,price,quantity_info,detail,group_name,is_random,price_data)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [goods_name, concert_ref||null, price||null, quantity_info||null,
     detail||null, group_name||null, is_random||false,
     price_data ? JSON.stringify(price_data) : null]
  );
  return res.status(200).json({ success: true });
}

async function updateGoods(body, res) {
  const { id, goods_name, concert_ref, price, quantity_info, detail, group_name, is_random, price_data } = body;
  await pool.query(
    `UPDATE goods SET goods_name=$1,concert_ref=$2,price=$3,quantity_info=$4,
     detail=$5,group_name=$6,is_random=$7,price_data=$8 WHERE id=$9`,
    [goods_name, concert_ref||null, price||null, quantity_info||null,
     detail||null, group_name||null, is_random||false,
     price_data ? JSON.stringify(price_data) : null, id]
  );
  return res.status(200).json({ success: true });
}

async function deleteGoods(body, res) {
  await pool.query('DELETE FROM goods WHERE id=$1', [body.id]);
  return res.status(200).json({ success: true });
}

// ── Notice ────────────────────────────────────────
async function addNotice(body, res) {
  const { type, content, source } = body;
  await pool.query(
    'INSERT INTO notice (type,content,source) VALUES ($1,$2,$3)',
    [type, content, source||null]
  );
  return res.status(200).json({ success: true });
}

async function updateNotice(body, res) {
  const { id, type, content, source } = body;
  await pool.query(
    'UPDATE notice SET type=$1,content=$2,source=$3 WHERE id=$4',
    [type, content, source||null, id]
  );
  return res.status(200).json({ success: true });
}

async function deleteNotice(body, res) {
  await pool.query('DELETE FROM notice WHERE id=$1', [body.id]);
  return res.status(200).json({ success: true });
}

// ── site_config ───────────────────────────────────
async function updateConfig(body, res) {
  const { key, value } = body;
  await pool.query(
    `INSERT INTO site_config (key,value) VALUES ($1,$2)
     ON CONFLICT (key) DO UPDATE SET value=$2`,
    [key, value]
  );
  return res.status(200).json({ success: true });
}

// ── 메인 핸들러 ──────────────────────────────────
export default async function handler(request, response) {
  if (request.method !== 'POST') return response.status(405).send('Method Not Allowed');

  try {
    const body = typeof request.body === 'string' ? JSON.parse(request.body) : request.body;
    const { action, username, password } = body;

    if (action === 'login') {
      const valid = await validateAuth(username, password);
      if (!valid) return response.status(401).json({ error: '아이디 또는 비밀번호가 올바르지 않습니다.' });
      return response.status(200).json({ success: true });
    }

    const valid = await validateAuth(username, password);
    if (!valid) return response.status(401).json({ error: '인증 실패' });

    switch (action) {
      case 'get-all':         return getAll(response);
      case 'add-concert':     return addConcert(body, response);
      case 'update-concert':  return updateConcert(body, response);
      case 'delete-concert':  return deleteConcert(body, response);
      case 'add-goods':       return addGoods(body, response);
      case 'update-goods':    return updateGoods(body, response);
      case 'delete-goods':    return deleteGoods(body, response);
      case 'add-notice':      return addNotice(body, response);
      case 'update-notice':   return updateNotice(body, response);
      case 'delete-notice':   return deleteNotice(body, response);
      case 'update-config':   return updateConfig(body, response);
      case 'add-waiting':     return addWaiting(body, response);
      case 'update-waiting':  return updateWaiting(body, response);
      case 'delete-waiting':  return deleteWaiting(body, response);
      default: return response.status(400).json({ error: 'Invalid action' });
    }
  } catch (error) {
    console.error('inf-admin 에러:', error);
    return response.status(500).json({ error: error.message });
  }
}
