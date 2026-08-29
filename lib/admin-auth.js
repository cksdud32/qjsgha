// 레거시 관리자 화면(api/admin.js, api/admin-logs.js)용 공통 인증 검증기.
//
// "AdminUsers".password 에는 항상 SHA-256(hex) 해시가 저장돼 있다.
// 클라이언트가 무엇을 보내느냐에 따라 두 방식이 있고, 둘 다 절대 URL query 로 받지 않는다.
//
//  (1) 해시 방식 — requireAdmin()
//      로그인 화면이 sessionStorage 에 비밀번호 SHA-256 해시만 저장(adminPwHash / _ip)하고
//      요청마다 헤더로 보낸다:
//        X-Admin-Username:       <username>
//        X-Admin-Password-Hash:  <sha256 hex>
//      서버는 재해시 없이 그대로 대조한다.
//      (하위호환) 헤더가 없으면 POST/DELETE 본문 { username, password } 를 본다.
//
//  (2) 평문 방식 — requireAdminPlain()
//      노래방 관리자 화면(html/ins-admin.html)은 비밀번호 원문을 sessionStorage(_kp)에 두고
//      요청마다 헤더로 보낸다:
//        X-Admin-Username:  <username>
//        X-Admin-Password:  <평문>
//      서버가 sha256 한 뒤 대조한다.
//      (하위호환) 헤더가 없으면 POST/DELETE 본문 { username, password } 를 평문으로 본다.
//
// 두 방식 모두 실패 시 AdminAuthError(status 401) 를 throw 한다. 호출부는 이 경우
// 어떤 DB 변경도 하기 전에 401 로 응답하고, 인증정보를 로그/오류 메시지/URL 에 남기지 않는다.
//
// ⚠️ 고정 SHA-256 해시(및 평문)라 재생 공격에 취약하다. 세션 토큰 기반 인증으로의
// 전환은 별도 과제로 남긴다.
//
// 중앙 API(api/projects, api/commands, api/agents)의 server/auth/adminAuth.js 와는
// 별개다.

import crypto from 'node:crypto';
import { pool } from './db.js';

export class AdminAuthError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AdminAuthError';
    this.status = 401;
    this.code = 'UNAUTHORIZED';
  }
}

function sha256Hex(text) {
  return crypto.createHash('sha256').update(String(text)).digest('hex');
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

function usernameFrom(request, body) {
  const h = headerValue(request, 'x-admin-username');
  if (h) return String(h);
  if (body && body.username) return String(body.username);
  return null;
}

// ── (1) 해시 방식 ────────────────────────────────────────────
// { username, passwordHash } 를 뽑는다. 헤더(X-Admin-Password-Hash) 우선, 없으면 본문 password. 없으면 null.
export function extractAdminCreds(request) {
  const body = bodyObject(request);
  const username = usernameFrom(request, body);
  const headerHash = headerValue(request, 'x-admin-password-hash');
  const passwordHash = headerHash ? String(headerHash) : (body && body.password ? String(body.password) : null);
  return username && passwordHash ? { username, passwordHash } : null;
}

// ── (2) 평문 방식 ────────────────────────────────────────────
// { username, password } 를 뽑는다. 헤더(X-Admin-Password) 우선, 없으면 본문 password. 없으면 null.
export function extractAdminPlainCreds(request) {
  const body = bodyObject(request);
  const username = usernameFrom(request, body);
  const headerPw = headerValue(request, 'x-admin-password');
  const password = headerPw ? String(headerPw) : (body && body.password ? String(body.password) : null);
  return username && password ? { username, password } : null;
}

// "AdminUsers" 에 저장된 (이미 해시된) 비밀번호와 대조. 통과 시 정규 username.
async function verifyAgainstStoredHash(username, passwordHash) {
  if (!username || !passwordHash) {
    throw new AdminAuthError('관리자 인증 정보가 필요합니다.');
  }
  const result = await pool.query(
    'SELECT username FROM "AdminUsers" WHERE username = $1 AND password = $2',
    [username, passwordHash]
  );
  if (result.rows.length === 0) {
    throw new AdminAuthError('아이디 또는 비밀번호가 올바르지 않습니다.');
  }
  return result.rows[0].username;
}

// 해시 방식 인증. 통과 시 정규 username, 실패 시 AdminAuthError(401).
export async function requireAdmin(request) {
  const creds = extractAdminCreds(request);
  if (!creds) throw new AdminAuthError('관리자 인증 정보가 필요합니다.');
  return verifyAgainstStoredHash(creds.username, creds.passwordHash);
}

// 평문 방식 인증(서버가 sha256 후 대조). 통과 시 정규 username, 실패 시 AdminAuthError(401).
export async function requireAdminPlain(request) {
  const creds = extractAdminPlainCreds(request);
  if (!creds) throw new AdminAuthError('관리자 인증 정보가 필요합니다.');
  return verifyAgainstStoredHash(creds.username, sha256Hex(creds.password));
}
