// 통합 테스트: 관리자 감사 로그(admin_logs).
// commandService.integration.test.js 와 동일하게, 별도 테스트 DB 없이 DATABASE_URL 에 대해 실행되며
// DB 연결이 없으면 각 테스트를 t.skip() 으로 건너뛴다.
//
// 검증 포인트:
//   - writeAdminLog() 가 id 를 넘기지 않아도 INSERT 가 성공한다 (0003 의 GENERATED ALWAYS AS IDENTITY).
//   - created_at 이 자동으로 채워진다.
//   - details 의 민감 키(password 등)는 저장되지 않는다 (lib/admin-log.js sanitizeDetails).
//   - api/admin-logs.js 가 인증/필터/페이지네이션을 정상 처리한다.

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

let pool, writeAdminLog, adminLogsHandler;
let dbAvailable = true;

const runId = Date.now();
const TEST_ADMIN = { username: `test-admin-${runId}`, passwordHash: `hash-${runId}` };

function fakeRes() {
  const res = { statusCode: 200, body: undefined };
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (payload) => { res.body = payload; return res; };
  return res;
}

before(async () => {
  try {
    ({ pool } = await import('../lib/db.js'));
    ({ writeAdminLog } = await import('../lib/admin-log.js'));
    adminLogsHandler = (await import('../api/admin-logs.js')).default;
    await pool.query('SELECT 1');

    // "AdminUsers" 는 with-test-db.mjs 가 scripts/test/test-legacy-tables.sql 로 미리 만들어 둔다.
    await pool.query(
      'INSERT INTO "AdminUsers" (username, password) VALUES ($1, $2) ON CONFLICT (username) DO NOTHING',
      [TEST_ADMIN.username, TEST_ADMIN.passwordHash]
    );
  } catch (error) {
    console.warn('[adminLog.integration.test] DB 연결 불가, 통합 테스트를 건너뜁니다:', error.message);
    dbAvailable = false;
  }
});

after(async () => {
  if (!dbAvailable) return;
  await pool.query(`DELETE FROM admin_logs WHERE action LIKE 'TEST\\_%'`).catch(() => {});
  await pool.query('DELETE FROM "AdminUsers" WHERE username = $1', [TEST_ADMIN.username]).catch(() => {});
  await pool.end();
});

test('writeAdminLog: id 를 안 넘겨도 INSERT 성공하고 id/created_at 이 자동 생성된다', async (t) => {
  if (!dbAvailable) return t.skip('DB 연결 불가');

  await writeAdminLog({
    adminId: TEST_ADMIN.username,
    action: 'TEST_BASIC',
    targetType: 'quiz',
    targetId: 42,
    details: { note: 'hello', nested: { a: 1 } },
  });

  const { rows } = await pool.query(
    `SELECT id, admin_id, action, target_type, target_id, details, status, created_at
       FROM admin_logs WHERE action = 'TEST_BASIC' ORDER BY id DESC LIMIT 1`
  );
  assert.equal(rows.length, 1);
  const row = rows[0];
  assert.ok(Number(row.id) > 0, 'id 자동 생성');
  assert.equal(row.admin_id, TEST_ADMIN.username);
  assert.equal(row.target_type, 'quiz');
  assert.equal(row.target_id, '42'); // writeAdminLog 는 String(targetId) 로 저장
  assert.equal(row.status, 'success');
  assert.ok(row.created_at instanceof Date, 'created_at 자동 생성');
  assert.deepEqual(row.details, { note: 'hello', nested: { a: 1 } });
});

test('writeAdminLog: details 의 민감 키는 저장되지 않는다', async (t) => {
  if (!dbAvailable) return t.skip('DB 연결 불가');

  await writeAdminLog({
    adminId: TEST_ADMIN.username,
    action: 'TEST_SANITIZE',
    details: { password: 'p@ss', token: 'abc', keep: 'yes' },
  });

  const { rows } = await pool.query(
    `SELECT details FROM admin_logs WHERE action = 'TEST_SANITIZE' ORDER BY id DESC LIMIT 1`
  );
  assert.deepEqual(rows[0].details, { keep: 'yes' });
});

test('writeAdminLog: adminId 가 없으면 unknown 으로 저장된다', async (t) => {
  if (!dbAvailable) return t.skip('DB 연결 불가');

  await writeAdminLog({ adminId: undefined, action: 'TEST_UNKNOWN' });
  const { rows } = await pool.query(
    `SELECT admin_id FROM admin_logs WHERE action = 'TEST_UNKNOWN' ORDER BY id DESC LIMIT 1`
  );
  assert.equal(rows[0].admin_id, 'unknown');
});

test('writeAdminLog: 로그 기록 실패는 throw 하지 않는다', async (t) => {
  if (!dbAvailable) return t.skip('DB 연결 불가');
  // action 은 NOT NULL. null 을 주면 INSERT 가 실패하지만 writeAdminLog 는 삼켜야 한다.
  await assert.doesNotReject(() => writeAdminLog({ adminId: 'x', action: null }));
});

test('api/admin-logs: 잘못된 인증은 401', async (t) => {
  if (!dbAvailable) return t.skip('DB 연결 불가');

  const res = fakeRes();
  await adminLogsHandler(
    { method: 'GET', query: { username: TEST_ADMIN.username, password: 'wrong' } },
    res
  );
  assert.equal(res.statusCode, 401);
});

test('api/admin-logs: 인증 통과 시 action 필터와 페이지네이션이 동작한다', async (t) => {
  if (!dbAvailable) return t.skip('DB 연결 불가');

  // TEST_PAGINATE 로그 3개 생성
  for (let i = 0; i < 3; i++) {
    await writeAdminLog({ adminId: TEST_ADMIN.username, action: 'TEST_PAGINATE', targetId: i });
  }

  const res = fakeRes();
  await adminLogsHandler(
    {
      method: 'GET',
      query: {
        username: TEST_ADMIN.username,
        password: TEST_ADMIN.passwordHash,
        action: 'TEST_PAGINATE',
        limit: '2',
        page: '1',
      },
    },
    res
  );

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.logs.length, 2);
  assert.equal(res.body.hasMore, true);
  assert.ok(res.body.logs.every((l) => l.action === 'TEST_PAGINATE'));
});
