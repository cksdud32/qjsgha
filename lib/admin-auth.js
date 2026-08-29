// 레거시 관리자 화면(api/admin.js, api/admin-logs.js)용 공통 인증 검증기.
//
// "AdminUsers".password 에는 항상 SHA-256(hex) 해시가 저장돼 있다. 로그인 화면은
// 로그인 성공 시 그 해시를 sessionStorage 에 넣어두고(adminPwHash / _ip),
// 이후 모든 요청에 아래 헤더로 실어 보낸다:
//
//   X-Admin-Username:       <username>
//   X-Admin-Password-Hash:  <sha256 hex>
//
// 서버는 재해시 없이 그대로 대조한다. 인증정보는 절대 URL query 로 받지 않는다.
// (하위호환) 헤더가 없으면 POST/DELETE 본문의 { username, password } 를 본다 —
// 변경성 액션 프론트가 아직 본문으로 보내기 때문. GET 에는 본문이 없다.
//
// ⚠️ 고정 SHA-256 해시라 재생 공격에 취약하다(탈취 시 재사용 가능). 세션 토큰 기반
// 인증으로의 전환은 별도 과제로 남긴다.
//
// 중앙 API(api/projects, api/commands, api/agents)의 server/auth/adminAuth.js 와는
// 별개다. 그쪽은 Basic 헤더 + 서버측 sha256(평문) 방식이다.

import { pool } from './db.js';

export class AdminAuthError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AdminAuthError';
    this.status = 401;
    this.code = 'UNAUTHORIZED';
  }
}

function headerValue(request, name) {
  const v = request?.headers?.[name];
  return Array.isArray(v) ? v[0] : v;
}

function bodyObject(request) {
  const b = request?.body;
  if (!b) return null;
  if (typeof b === 'string') {
    try { return JSON.parse(b); } catch { return null; }
  }
  return typeof b === 'object' ? b : null;
}

// 요청에서 { username, passwordHash } 를 뽑는다. 헤더 우선, 없으면 본문. 없으면 null.
export function extractAdminCreds(request) {
  const headerUser = headerValue(request, 'x-admin-username');
  const headerHash = headerValue(request, 'x-admin-password-hash');
  if (headerUser && headerHash) {
    return { username: String(headerUser), passwordHash: String(headerHash) };
  }
  const body = bodyObject(request);
  if (body && body.username && body.password) {
    return { username: String(body.username), passwordHash: String(body.password) };
  }
  return null;
}

// 통과 시 "AdminUsers" 에 저장된 정규 username 을 반환한다.
// 인증정보 누락/불일치 시 AdminAuthError(status 401) 를 throw 한다.
// 호출부는 이 경우 어떤 DB 변경도 하기 전에 401 로 응답하고, 인증정보를 로그/응답에 남기지 않는다.
export async function requireAdmin(request) {
  const creds = extractAdminCreds(request);
  if (!creds || !creds.username || !creds.passwordHash) {
    throw new AdminAuthError('관리자 인증 정보가 필요합니다.');
  }
  const result = await pool.query(
    'SELECT username FROM "AdminUsers" WHERE username = $1 AND password = $2',
    [creds.username, creds.passwordHash]
  );
  if (result.rows.length === 0) {
    throw new AdminAuthError('아이디 또는 비밀번호가 올바르지 않습니다.');
  }
  return result.rows[0].username;
}
