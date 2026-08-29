import { pool } from '../lib/db.js';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

// 기존 inf-admin.js / admin.js 와 동일한 인증 방식.
// AdminUsers.password 컬럼에는 항상 SHA-256 해시가 들어있고,
// 클라이언트가 미리 해시해서 보내든(inf-admin.html) 서버가 해시하든(admin.js) 결국 같은 값과 비교한다.
// 여기서는 inf-admin.html 방식과 동일하게 "이미 해시된 password" 를 받는다.
async function validateAuth(username, hashedPassword) {
  if (!username || !hashedPassword) return false;
  const res = await pool.query(
    'SELECT id FROM "AdminUsers" WHERE username = $1 AND password = $2',
    [username, hashedPassword]
  );
  return res.rows.length > 0;
}

export default async function handler(request, response) {
  if (request.method !== 'GET') return response.status(405).json({ error: 'Method Not Allowed' });

  try {
    const { username, password, action, adminId, status, from, to } = request.query;

    const authorized = await validateAuth(username, password);
    if (!authorized) {
      return response.status(401).json({ error: '인증에 실패했습니다.' });
    }

    let limit = parseInt(request.query.limit, 10);
    if (!Number.isFinite(limit) || limit <= 0) limit = DEFAULT_LIMIT;
    limit = Math.min(limit, MAX_LIMIT);

    let page = parseInt(request.query.page, 10);
    if (!Number.isFinite(page) || page <= 0) page = 1;
    const offset = (page - 1) * limit;

    const conditions = [];
    const params = [];

    if (action) {
      params.push(action);
      conditions.push(`action = $${params.length}`);
    }
    if (adminId) {
      params.push(adminId);
      conditions.push(`admin_id = $${params.length}`);
    }
    if (status) {
      params.push(status);
      conditions.push(`status = $${params.length}`);
    }
    if (from) {
      params.push(from);
      conditions.push(`created_at >= $${params.length}`);
    }
    if (to) {
      params.push(to);
      conditions.push(`created_at <= $${params.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    params.push(limit + 1);
    const limitParamIndex = params.length;
    params.push(offset);
    const offsetParamIndex = params.length;

    const result = await pool.query(
      `SELECT id, admin_id, action, target_type, target_id, details, status, created_at
       FROM admin_logs
       ${where}
       ORDER BY created_at DESC
       LIMIT $${limitParamIndex} OFFSET $${offsetParamIndex}`,
      params
    );

    const hasMore = result.rows.length > limit;
    const logs = hasMore ? result.rows.slice(0, limit) : result.rows;

    return response.status(200).json({ logs, hasMore, page, limit });
  } catch (error) {
    console.error('admin-logs 조회 오류:', error);
    return response.status(500).json({ error: error.message });
  }
}
