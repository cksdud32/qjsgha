import crypto from 'crypto';
import { pool } from '../../lib/db.js';
import { ApiError, parseBody } from '../http/respond.js';

// 기존 admin.js / inf-admin.js와 동일한 "AdminUsers" 테이블 + sha256 해시 방식을 그대로 재사용한다.
// 새로운 로그인/세션 시스템을 만들지 않고, DB 커넥션도 lib/db.js의 공용 풀을 그대로 쓴다.

function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

// Authorization: Basic base64(username:password) 헤더를 우선 사용한다.
// (GET 요청에도 인증 정보를 실어 보낼 수 있어야 하기 때문)
// 없으면 기존 admin.js 방식대로 JSON body의 { username, password }를 사용한다.
function extractCredentials(request) {
  const authHeader = request.headers['authorization'] || '';
  if (authHeader.startsWith('Basic ')) {
    try {
      const decoded = Buffer.from(authHeader.slice('Basic '.length), 'base64').toString('utf8');
      const separatorIndex = decoded.indexOf(':');
      if (separatorIndex === -1) return null;
      return {
        username: decoded.slice(0, separatorIndex),
        password: decoded.slice(separatorIndex + 1)
      };
    } catch {
      return null;
    }
  }

  const body = parseBody(request);
  if (body && body.username && body.password) {
    return { username: body.username, password: body.password };
  }
  return null;
}

// 통과 시 관리자 username을 반환, 실패 시 ApiError(401)를 throw한다.
export async function requireAdmin(request) {
  const credentials = extractCredentials(request);
  if (!credentials) {
    throw new ApiError(401, 'UNAUTHORIZED', '관리자 인증 정보가 필요합니다.');
  }

  const { username, password } = credentials;
  const result = await pool.query(
    'SELECT id, username FROM "AdminUsers" WHERE username = $1 AND password = $2',
    [username, sha256(password)]
  );

  if (result.rows.length === 0) {
    throw new ApiError(401, 'UNAUTHORIZED', '아이디 또는 비밀번호가 올바르지 않습니다.');
  }

  return username;
}
