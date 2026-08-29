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
