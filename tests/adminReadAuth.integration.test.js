// 통합 테스트: 조회성 관리자 액션의 헤더 인증.
//   - getSuggestions / getAllProblems / getAdminRanking (api/admin.js)
//   - api/admin-logs.js
// 정상 조회 / 인증 누락 / 잘못된 해시, 그리고 401 응답에 인증정보가 새지 않는지 검증.
//
// 규칙: 실제 DATABASE_URL, DB 없으면 skip. test- 접두사 정리.

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

let pool, admin, adminLogsHandler;
let dbAvailable = true;

const runId = Date.now();
const USER = `test-readadmin-${runId}`;
const PW_HASH = crypto.createHash('sha256').update(`pw-${runId}`).digest('hex');
const BAD_HASH = crypto.createHash('sha256').update('nope').digest('hex');
const AUTH_HEADERS = { 'x-admin-username': USER, 'x-admin-password-hash': PW_HASH };

function fakeRes() {
  return {
    statusCode: 200,
    body: undefined,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; },
  };
}
function getReq(headers = {}, query = {}) {
  return { method: 'GET', headers, query, body: undefined };
}

before(async () => {
  try {
    ({ pool } = await import('../lib/db.js'));
    admin = await import('../api/admin.js');
    adminLogsHandler = (await import('../api/admin-logs.js')).default;
    await pool.query('SELECT 1');
    // "AdminUsers" / difficulty 등 스켈레톤은 with-test-db.mjs 가 미리 만들어 둔다.
    await pool.query(
      'INSERT INTO "AdminUsers" (username, password) VALUES ($1, $2) ON CONFLICT (username) DO NOTHING',
      [USER, PW_HASH]
    );
  } catch (error) {
    console.warn('[adminReadAuth.integration.test] DB 연결 불가, 건너뜁니다:', error.message);
    dbAvailable = false;
  }
});

after(async () => {
  if (!dbAvailable) return;
  await pool.query('DELETE FROM "AdminUsers" WHERE username = $1', [USER]).catch(() => {});
  await pool.end();
});

test('getSuggestions: 인증 헤더 없으면 401', async (t) => {
  if (!dbAvailable) return t.skip('DB 연결 불가');
  const res = fakeRes();
  await admin.getSuggestions(getReq({}), res);
  assert.equal(res.statusCode, 401);
});

test('getSuggestions: 잘못된 해시면 401', async (t) => {
  if (!dbAvailable) return t.skip('DB 연결 불가');
  const res = fakeRes();
  await admin.getSuggestions(getReq({ 'x-admin-username': USER, 'x-admin-password-hash': BAD_HASH }), res);
  assert.equal(res.statusCode, 401);
});

test('getSuggestions: 정상 헤더 인증이면 200 (배열)', async (t) => {
  if (!dbAvailable) return t.skip('DB 연결 불가');
  const res = fakeRes();
  await admin.getSuggestions(getReq(AUTH_HEADERS), res);
  assert.equal(res.statusCode, 200);
  assert.ok(Array.isArray(res.body));
});

test('getAllProblems: 인증 없으면 401 / 정상이면 200', async (t) => {
  if (!dbAvailable) return t.skip('DB 연결 불가');
  const r1 = fakeRes();
  await admin.getAllProblems(getReq({}), r1);
  assert.equal(r1.statusCode, 401);

  const r2 = fakeRes();
  await admin.getAllProblems(getReq(AUTH_HEADERS, {}), r2);
  assert.equal(r2.statusCode, 200);
  assert.ok(Array.isArray(r2.body.problems));
});

test('getAdminRanking: 인증 검사가 난이도 검사보다 먼저 (헤더 없으면 401)', async (t) => {
  if (!dbAvailable) return t.skip('DB 연결 불가');
  const r1 = fakeRes();
  await admin.getAdminRanking(getReq({}, { difficulty: 'easy' }), r1);
  assert.equal(r1.statusCode, 401);

  const r2 = fakeRes();
  await admin.getAdminRanking(getReq(AUTH_HEADERS, { difficulty: 'easy' }), r2);
  assert.equal(r2.statusCode, 200);
  assert.ok(Array.isArray(r2.body.rankings));
});

test('admin-logs: 인증 없음 401 / 잘못된 해시 401 / 정상 200', async (t) => {
  if (!dbAvailable) return t.skip('DB 연결 불가');
  const r1 = fakeRes();
  await adminLogsHandler(getReq({}), r1);
  assert.equal(r1.statusCode, 401);

  const r2 = fakeRes();
  await adminLogsHandler(getReq({ 'x-admin-username': USER, 'x-admin-password-hash': BAD_HASH }), r2);
  assert.equal(r2.statusCode, 401);

  const r3 = fakeRes();
  await adminLogsHandler(getReq(AUTH_HEADERS, { limit: '5' }), r3);
  assert.equal(r3.statusCode, 200);
  assert.ok(Array.isArray(r3.body.logs));
});

test('401 응답에 username / 비밀번호 해시가 포함되지 않는다', async (t) => {
  if (!dbAvailable) return t.skip('DB 연결 불가');
  const res = fakeRes();
  await admin.getSuggestions(getReq({ 'x-admin-username': USER, 'x-admin-password-hash': BAD_HASH }), res);
  assert.equal(res.statusCode, 401);
  const serialized = JSON.stringify(res.body);
  assert.ok(!serialized.includes(USER), '응답에 username 노출');
  assert.ok(!serialized.includes(BAD_HASH), '응답에 비밀번호 해시 노출');
});
