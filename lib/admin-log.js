// 관리자 감사 로그 공통 기록 모듈.
//
// 모든 관리자 API는 직접 INSERT 하지 말고 writeAdminLog() 를 통해서만 기록한다.
// DB 연결은 lib/db.js 의 공용 pool 을 그대로 쓴다 (새 Pool 생성 금지).
//
// 중요: 로그 기록 실패가 원래 관리자 기능의 실패로 이어지면 안 된다.
// 그래서 이 함수는 절대 throw 하지 않고, 실패하면 console.error 만 남긴다.

import { pool } from './db.js';

const SENSITIVE_KEYS = new Set([
  'password', 'passwd', 'pw',
  'database_url', 'db_url', 'postgres_url', 'prisma_database_url', 'connectionstring', 'connection_string',
  'discord_token', 'discord_bot_token', 'bot_token', 'token', 'access_token', 'refresh_token', 'secret',
  'cookie', 'authorization',
]);

function sanitizeDetails(details) {
  if (details == null) return null;
  if (typeof details !== 'object') return { value: String(details) };

  const clean = {};
  for (const [key, value] of Object.entries(details)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) continue;
    clean[key] = value;
  }
  return clean;
}

// writeAdminLog({ adminId, action, targetType, targetId, details, status })
export async function writeAdminLog({ adminId, action, targetType = null, targetId = null, details = null, status = 'success' }) {
  try {
    const clean = sanitizeDetails(details);
    await pool.query(
      `INSERT INTO admin_logs (admin_id, action, target_type, target_id, details, status)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        adminId != null ? String(adminId) : 'unknown',
        action,
        targetType,
        targetId != null ? String(targetId) : null,
        clean ? JSON.stringify(clean) : null,
        status,
      ]
    );
  } catch (err) {
    console.error('[admin-log] 기록 실패:', err.message, { action, adminId, status });
  }
}
