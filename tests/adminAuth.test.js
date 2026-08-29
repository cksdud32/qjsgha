// 단위 테스트(DB 불필요, 기본 npm test 에 포함): lib/admin-auth.js 의 자격증명 추출/검증.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  extractAdminCreds,
  extractAdminPlainCreds,
  requireAdmin,
  requireAdminPlain,
  AdminAuthError,
} from '../lib/admin-auth.js';

function req({ headers = {}, body } = {}) {
  return { headers, body };
}

// 클라이언트(html/*)의 encodeCred 와 동일: UTF-8 -> base64url(패딩 제거)
function enc(value) {
  return Buffer.from(String(value), 'utf8').toString('base64url');
}
function encHeaders(extra) {
  return { 'x-admin-credentials-encoding': 'base64url-utf8', ...extra };
}

test('extractAdminCreds: X-Admin-* 헤더에서 뽑는다', () => {
  const c = extractAdminCreds(req({ headers: { 'x-admin-username': 'alice', 'x-admin-password-hash': 'abc123' } }));
  assert.deepEqual(c, { username: 'alice', passwordHash: 'abc123' });
});

test('extractAdminCreds: 헤더가 없으면 본문 {username,password} 하위호환', () => {
  const c = extractAdminCreds(req({ body: { username: 'bob', password: 'def456' } }));
  assert.deepEqual(c, { username: 'bob', passwordHash: 'def456' });
});

test('extractAdminCreds: 본문이 JSON 문자열이어도 파싱한다', () => {
  const c = extractAdminCreds(req({ body: JSON.stringify({ username: 'bob', password: 'def456' }) }));
  assert.deepEqual(c, { username: 'bob', passwordHash: 'def456' });
});

test('extractAdminCreds: 헤더가 본문보다 우선', () => {
  const c = extractAdminCreds(
    req({
      headers: { 'x-admin-username': 'from-header', 'x-admin-password-hash': 'HH' },
      body: { username: 'from-body', password: 'BB' },
    })
  );
  assert.deepEqual(c, { username: 'from-header', passwordHash: 'HH' });
});

test('extractAdminCreds: 반쪽만 있으면 null', () => {
  assert.equal(extractAdminCreds(req()), null);
  assert.equal(extractAdminCreds(req({ headers: { 'x-admin-username': 'only-user' } })), null);
  assert.equal(extractAdminCreds(req({ body: { username: 'u' } })), null);
});

test('requireAdmin: 인증정보 누락이면 DB 조회 전에 AdminAuthError(401)', async () => {
  await assert.rejects(
    () => requireAdmin(req()),
    (e) => e instanceof AdminAuthError && e.status === 401 && e.code === 'UNAUTHORIZED'
  );
});

// ── 평문 방식 (노래방 관리자 화면) ──────────────────────────
test('extractAdminPlainCreds: X-Admin-Password(평문) 헤더에서 뽑는다', () => {
  const c = extractAdminPlainCreds(
    req({ headers: { 'x-admin-username': 'kara', 'x-admin-password': 's3cret' } })
  );
  assert.deepEqual(c, { username: 'kara', password: 's3cret' });
});

test('extractAdminPlainCreds: 헤더 없으면 본문 {username,password} 하위호환', () => {
  const c = extractAdminPlainCreds(req({ body: { username: 'kara', password: 's3cret' } }));
  assert.deepEqual(c, { username: 'kara', password: 's3cret' });
});

test('extractAdminPlainCreds: 헤더가 본문보다 우선', () => {
  const c = extractAdminPlainCreds(
    req({
      headers: { 'x-admin-username': 'h', 'x-admin-password': 'H' },
      body: { username: 'b', password: 'B' },
    })
  );
  assert.deepEqual(c, { username: 'h', password: 'H' });
});

test('extractAdminPlainCreds: 반쪽만 있으면 null', () => {
  assert.equal(extractAdminPlainCreds(req()), null);
  assert.equal(extractAdminPlainCreds(req({ headers: { 'x-admin-username': 'only' } })), null);
});

test('requireAdminPlain: 인증정보 누락이면 DB 조회 전에 AdminAuthError(401)', async () => {
  await assert.rejects(
    () => requireAdminPlain(req()),
    (e) => e instanceof AdminAuthError && e.status === 401
  );
});

// ── base64url-utf8 인코딩 헤더 ──────────────────────────────
test('extractAdminCreds: 표식 있으면 base64url(UTF-8) 헤더를 디코딩한다 (한글 username)', () => {
  const c = extractAdminCreds(
    req({
      headers: encHeaders({
        'x-admin-username': enc('현준관리자'),
        'x-admin-password-hash': enc('abcdef0123456789'),
      }),
    })
  );
  assert.deepEqual(c, { username: '현준관리자', passwordHash: 'abcdef0123456789' });
});

test('extractAdminPlainCreds: 표식 있으면 한글·특수문자 평문 비밀번호를 디코딩한다', () => {
  const c = extractAdminPlainCreds(
    req({
      headers: encHeaders({
        'x-admin-username': enc('현준'),
        'x-admin-password': enc('한글암호!@#$%^&*()_+ 空白'),
      }),
    })
  );
  assert.deepEqual(c, { username: '현준', password: '한글암호!@#$%^&*()_+ 空白' });
});

test('표식 있으면 순수 ASCII 값도 디코딩되어 그대로 나온다', () => {
  const c = extractAdminCreds(
    req({ headers: encHeaders({ 'x-admin-username': enc('alice'), 'x-admin-password-hash': enc('deadbeef') }) })
  );
  assert.deepEqual(c, { username: 'alice', passwordHash: 'deadbeef' });
});

test('표식 없으면 값을 그대로 쓴다 (ASCII 하위호환, 디코딩 안 함)', () => {
  const c = extractAdminCreds(
    req({ headers: { 'x-admin-username': 'YWxpY2U', 'x-admin-password-hash': 'deadbeef' } })
  );
  assert.deepEqual(c, { username: 'YWxpY2U', passwordHash: 'deadbeef' }); // 'YWxpY2U' 를 디코딩하지 않는다
});

test('표식 있고 잘못된 인코딩이면 AdminAuthError(401) (username)', () => {
  assert.throws(
    () => extractAdminCreds(req({ headers: encHeaders({ 'x-admin-username': 'not valid base64!!', 'x-admin-password-hash': enc('x') }) })),
    (e) => e instanceof AdminAuthError && e.status === 401
  );
});

test('표식 있고 비정규 base64url(길이 4k+1)이면 AdminAuthError(401)', () => {
  assert.throws(
    () => extractAdminPlainCreds(req({ headers: encHeaders({ 'x-admin-username': enc('u'), 'x-admin-password': 'YWJj_' }) })),
    (e) => e instanceof AdminAuthError && e.status === 401
  );
});

test('requireAdmin: 표식 있고 잘못된 인코딩이면 DB 조회 전에 401', async () => {
  await assert.rejects(
    () => requireAdmin(req({ headers: encHeaders({ 'x-admin-username': '@@@', 'x-admin-password-hash': enc('h') }) })),
    (e) => e instanceof AdminAuthError && e.status === 401
  );
});

test('표식 있어도 헤더가 없으면 본문 폴백 (본문은 인코딩 안 함)', () => {
  const c = extractAdminCreds(
    req({ headers: { 'x-admin-credentials-encoding': 'base64url-utf8' }, body: { username: '현준', password: 'hash' } })
  );
  assert.deepEqual(c, { username: '현준', passwordHash: 'hash' });
});
