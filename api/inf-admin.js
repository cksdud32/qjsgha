import crypto from 'crypto';
import { pool } from '../lib/db.js';
import { writeAdminLog } from '../lib/admin-log.js';

function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

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
  const { concert_ref, group_name, wait_start, entry_start, sort_order, username } = body;
  try {
    const inserted = await pool.query(
      `INSERT INTO waiting_group (concert_ref,group_name,wait_start,entry_start,sort_order)
       VALUES ($1,$2,$3,$4,$5) RETURNING id`,
      [concert_ref||null, group_name, wait_start||null, entry_start||null, sort_order||0]
    );
    await writeAdminLog({ adminId: username, action: 'WAITING_CREATE', targetType: 'waiting_group', targetId: inserted.rows[0]?.id });
    return res.status(200).json({ success: true });
  } catch (error) {
    await writeAdminLog({ adminId: username, action: 'WAITING_CREATE', targetType: 'waiting_group', status: 'failed', details: { error: error.message } });
    throw error;
  }
}

async function updateWaiting(body, res) {
  const { id, concert_ref, group_name, wait_start, entry_start, sort_order, username } = body;
  try {
    await pool.query(
      `UPDATE waiting_group SET concert_ref=$1,group_name=$2,wait_start=$3,entry_start=$4,sort_order=$5
       WHERE id=$6`,
      [concert_ref||null, group_name, wait_start||null, entry_start||null, sort_order||0, id]
    );
    await writeAdminLog({ adminId: username, action: 'WAITING_UPDATE', targetType: 'waiting_group', targetId: id });
    return res.status(200).json({ success: true });
  } catch (error) {
    await writeAdminLog({ adminId: username, action: 'WAITING_UPDATE', targetType: 'waiting_group', targetId: id, status: 'failed', details: { error: error.message } });
    throw error;
  }
}

async function deleteWaiting(body, res) {
  const { username } = body;
  try {
    await pool.query('DELETE FROM waiting_group WHERE id=$1', [body.id]);
    await writeAdminLog({ adminId: username, action: 'WAITING_DELETE', targetType: 'waiting_group', targetId: body.id });
    return res.status(200).json({ success: true });
  } catch (error) {
    await writeAdminLog({ adminId: username, action: 'WAITING_DELETE', targetType: 'waiting_group', targetId: body.id, status: 'failed', details: { error: error.message } });
    throw error;
  }
}

// ── Concert ──────────────────────────────────────
async function addConcert(body, res) {
  const { name, date_label, event_date, status, ticket_price, delivery_fee, ticketing_info,
          waiting_time, entry_wait_time, run_time, goods_sale_time,
          location_url, dress_code, setlist_url, extra_info_url, username } = body;
  try {
    const inserted = await pool.query(
      `INSERT INTO concert
       (name,date_label,event_date,status,ticket_price,delivery_fee,ticketing_info,
        waiting_time,entry_wait_time,run_time,goods_sale_time,
        location_url,dress_code,setlist_url,extra_info_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING id`,
      [name, date_label||null, event_date||null, status||null, ticket_price||null, delivery_fee||null,
       ticketing_info||null, waiting_time||null, entry_wait_time||null,
       run_time||null, goods_sale_time||null,
       location_url||null, dress_code||null, setlist_url||null, extra_info_url||null]
    );
    await writeAdminLog({ adminId: username, action: 'CONCERT_CREATE', targetType: 'concert', targetId: inserted.rows[0]?.id, details: { name } });
    return res.status(200).json({ success: true });
  } catch (error) {
    await writeAdminLog({ adminId: username, action: 'CONCERT_CREATE', targetType: 'concert', status: 'failed', details: { error: error.message, name } });
    throw error;
  }
}

async function updateConcert(body, res) {
  const { id, name, date_label, event_date, status, ticket_price, delivery_fee, ticketing_info,
          waiting_time, entry_wait_time, run_time, goods_sale_time,
          location_url, dress_code, setlist_url, extra_info_url, username } = body;
  try {
    await pool.query(
      `UPDATE concert SET
       name=$1,date_label=$2,event_date=$3,status=$4,ticket_price=$5,delivery_fee=$6,
       ticketing_info=$7,waiting_time=$8,entry_wait_time=$9,run_time=$10,
       goods_sale_time=$11,location_url=$12,dress_code=$13,setlist_url=$14,extra_info_url=$15
       WHERE id=$16`,
      [name, date_label||null, event_date||null, status||null, ticket_price||null, delivery_fee||null,
       ticketing_info||null, waiting_time||null, entry_wait_time||null,
       run_time||null, goods_sale_time||null,
       location_url||null, dress_code||null, setlist_url||null, extra_info_url||null, id]
    );
    await writeAdminLog({ adminId: username, action: 'CONCERT_UPDATE', targetType: 'concert', targetId: id, details: { name } });
    return res.status(200).json({ success: true });
  } catch (error) {
    await writeAdminLog({ adminId: username, action: 'CONCERT_UPDATE', targetType: 'concert', targetId: id, status: 'failed', details: { error: error.message } });
    throw error;
  }
}

async function deleteConcert(body, res) {
  const { username } = body;
  try {
    await pool.query('DELETE FROM concert WHERE id=$1', [body.id]);
    await writeAdminLog({ adminId: username, action: 'CONCERT_DELETE', targetType: 'concert', targetId: body.id });
    return res.status(200).json({ success: true });
  } catch (error) {
    await writeAdminLog({ adminId: username, action: 'CONCERT_DELETE', targetType: 'concert', targetId: body.id, status: 'failed', details: { error: error.message } });
    throw error;
  }
}

// ── Goods ─────────────────────────────────────────
async function addGoods(body, res) {
  const { goods_name, concert_ref, price, quantity_info, detail, group_name, is_random, price_data, username } = body;
  try {
    const inserted = await pool.query(
      `INSERT INTO goods (goods_name,concert_ref,price,quantity_info,detail,group_name,is_random,price_data)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
      [goods_name, concert_ref||null, price||null, quantity_info||null,
       detail||null, group_name||null, is_random||false,
       price_data ? JSON.stringify(price_data) : null]
    );
    await writeAdminLog({ adminId: username, action: 'GOODS_CREATE', targetType: 'goods', targetId: inserted.rows[0]?.id, details: { goods_name } });
    return res.status(200).json({ success: true });
  } catch (error) {
    await writeAdminLog({ adminId: username, action: 'GOODS_CREATE', targetType: 'goods', status: 'failed', details: { error: error.message, goods_name } });
    throw error;
  }
}

async function updateGoods(body, res) {
  const { id, goods_name, concert_ref, price, quantity_info, detail, group_name, is_random, price_data, username } = body;
  try {
    await pool.query(
      `UPDATE goods SET goods_name=$1,concert_ref=$2,price=$3,quantity_info=$4,
       detail=$5,group_name=$6,is_random=$7,price_data=$8 WHERE id=$9`,
      [goods_name, concert_ref||null, price||null, quantity_info||null,
       detail||null, group_name||null, is_random||false,
       price_data ? JSON.stringify(price_data) : null, id]
    );
    await writeAdminLog({ adminId: username, action: 'GOODS_UPDATE', targetType: 'goods', targetId: id, details: { goods_name } });
    return res.status(200).json({ success: true });
  } catch (error) {
    await writeAdminLog({ adminId: username, action: 'GOODS_UPDATE', targetType: 'goods', targetId: id, status: 'failed', details: { error: error.message } });
    throw error;
  }
}

async function deleteGoods(body, res) {
  const { username } = body;
  try {
    await pool.query('DELETE FROM goods WHERE id=$1', [body.id]);
    await writeAdminLog({ adminId: username, action: 'GOODS_DELETE', targetType: 'goods', targetId: body.id });
    return res.status(200).json({ success: true });
  } catch (error) {
    await writeAdminLog({ adminId: username, action: 'GOODS_DELETE', targetType: 'goods', targetId: body.id, status: 'failed', details: { error: error.message } });
    throw error;
  }
}

// ── Notice ────────────────────────────────────────
async function addNotice(body, res) {
  const { type, content, source, username } = body;
  try {
    const inserted = await pool.query(
      'INSERT INTO notice (type,content,source) VALUES ($1,$2,$3) RETURNING id',
      [type, content, source||null]
    );
    await writeAdminLog({ adminId: username, action: 'NOTICE_CREATE', targetType: 'notice', targetId: inserted.rows[0]?.id, details: { type } });
    return res.status(200).json({ success: true });
  } catch (error) {
    await writeAdminLog({ adminId: username, action: 'NOTICE_CREATE', targetType: 'notice', status: 'failed', details: { error: error.message, type } });
    throw error;
  }
}

async function updateNotice(body, res) {
  const { id, type, content, source, username } = body;
  try {
    await pool.query(
      'UPDATE notice SET type=$1,content=$2,source=$3 WHERE id=$4',
      [type, content, source||null, id]
    );
    await writeAdminLog({ adminId: username, action: 'NOTICE_UPDATE', targetType: 'notice', targetId: id, details: { type } });
    return res.status(200).json({ success: true });
  } catch (error) {
    await writeAdminLog({ adminId: username, action: 'NOTICE_UPDATE', targetType: 'notice', targetId: id, status: 'failed', details: { error: error.message } });
    throw error;
  }
}

async function deleteNotice(body, res) {
  const { username } = body;
  try {
    await pool.query('DELETE FROM notice WHERE id=$1', [body.id]);
    await writeAdminLog({ adminId: username, action: 'NOTICE_DELETE', targetType: 'notice', targetId: body.id });
    return res.status(200).json({ success: true });
  } catch (error) {
    await writeAdminLog({ adminId: username, action: 'NOTICE_DELETE', targetType: 'notice', targetId: body.id, status: 'failed', details: { error: error.message } });
    throw error;
  }
}

// ── site_config ───────────────────────────────────
async function updateConfig(body, res) {
  const { key, value, username } = body;
  try {
    await pool.query(
      `INSERT INTO site_config (key,value) VALUES ($1,$2)
       ON CONFLICT (key) DO UPDATE SET value=$2`,
      [key, value]
    );
    await writeAdminLog({ adminId: username, action: 'CONFIG_UPDATE', targetType: 'site_config', targetId: key });
    return res.status(200).json({ success: true });
  } catch (error) {
    await writeAdminLog({ adminId: username, action: 'CONFIG_UPDATE', targetType: 'site_config', targetId: key, status: 'failed', details: { error: error.message } });
    throw error;
  }
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
