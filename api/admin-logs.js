import { pool } from '../lib/db.js';
import { requireAdmin } from '../lib/admin-auth.js';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

// 인증은 lib/admin-auth.js 로 통일한다. username + 비밀번호 SHA-256 해시를
// X-Admin-Username / X-Admin-Password-Hash 헤더로 받는다(URL query 아님).
export default async function handler(request, response) {
  if (request.method !== 'GET') return response.status(405).json({ error: 'Method Not Allowed' });

  try {
    await requireAdmin(request);

    const { action, adminId, status, from, to } = request.query;

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
    if (error.status === 401) return response.status(401).json({ error: error.message });
    console.error('admin-logs 조회 오류:', error);
    return response.status(500).json({ error: error.message });
  }
}
