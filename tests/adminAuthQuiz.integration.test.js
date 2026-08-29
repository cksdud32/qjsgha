// 통합 테스트: api/admin.js 의 변경성 퀴즈/랭킹 액션에 대한 서버측 인증.
//
// 검증:
//   - 성공 인증(username + 비밀번호 SHA-256 해시)이면 액션이 수행되고,
//     감사 로그 admin_id 는 "서버가 검증한" username 으로 기록된다.
//   - 비밀번호 오류 / 인증정보 누락이면 DB 변경 전에 401 로 거부되고 로그도 안 남는다.
//   - 클라이언트가 body.adminUsername / requestedBy 등을 위조해도 무시되고,
//     검증된 username 만 로그에 남는다.
//
// 규칙: 실제 DATABASE_URL, DB 없으면 skip. test- 접두사 정리.

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

let pool, admin;
let dbAvailable = true;

const runId = Date.now();
const USER = `test-quizadmin-${runId}`;
const PW_PLAIN = `secret-${runId}`;
const PW_HASH = crypto.createHash('sha256').update(PW_PLAIN).digest('hex');
const WRONG_HASH = crypto.createHash('sha256').update('wrong').digest('hex');

function fakeReqRes(method, body) {
  const req = { method, query: {}, body };
  const res = {
    statusCode: 200,
    body: undefined,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; },
  };
  return { req, res };
}

async function insertRanking(label) {
  const { rows } = await pool.query(
    `INSERT INTO "quiz_ranking" (name, score, difficulty_id) VALUES ($1, 1, 1) RETURNING id`,
    [`test-rank-${runId}-${label}`]
  );
  return rows[0].id;
}
async function rankingExists(id) {
  const { rows } = await pool.query('SELECT 1 FROM "quiz_ranking" WHERE id = $1', [id]);
  return rows.length > 0;
}
async function logsForTarget(id) {
  const { rows } = await pool.query(
    `SELECT admin_id, status FROM admin_logs WHERE action = 'QUIZ_RANKING_DELETE' AND target_id = $1`,
    [String(id)]
  );
  return rows;
}

before(async () => {
  try {
    ({ pool } = await import('../lib/db.js'));
    admin = await import('../api/admin.js');
    await pool.query('SELECT 1');

    // "AdminUsers" / "quiz_ranking" 는 with-test-db.mjs 가
    // scripts/test/test-legacy-tables.sql 로 미리 만들어 둔다. 여기서는 테스트 행만 넣는다.
    await pool.query(
      'INSERT INTO "AdminUsers" (username, password) VALUES ($1, $2) ON CONFLICT (username) DO NOTHING',
      [USER, PW_HASH]
    );
  } catch (error) {
    console.warn('[adminAuthQuiz.integration.test] DB 연결 불가, 건너뜁니다:', error.message);
    dbAvailable = false;
  }
});

after(async () => {
  if (!dbAvailable) return;
  await pool.query(`DELETE FROM admin_logs WHERE admin_id = $1 OR admin_id LIKE 'HACKER%'`, [USER]).catch(() => {});
  await pool.query(`DELETE FROM "quiz_ranking" WHERE name LIKE $1`, [`test-rank-${runId}-%`]).catch(() => {});
  await pool.query('DELETE FROM "AdminUsers" WHERE username = $1', [USER]).catch(() => {});
  await pool.end();
});

test('성공 인증: 액션 수행 + 감사 로그 admin_id = 서버가 검증한 username', async (t) => {
  if (!dbAvailable) return t.skip('DB 연결 불가');
  const id = await insertRanking('ok');

  const { req, res } = fakeReqRes('DELETE', { rankingId: id, username: USER, password: PW_HASH });
  await admin.deleteRanking(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(await rankingExists(id), false, '랭킹이 삭제됨');
  const logs = await logsForTarget(id);
  assert.equal(logs.length, 1);
  assert.equal(logs[0].admin_id, USER);
  assert.equal(logs[0].status, 'success');
});

test('비밀번호 오류: 401 + DB 변경 없음 + 감사 로그 없음', async (t) => {
  if (!dbAvailable) return t.skip('DB 연결 불가');
  const id = await insertRanking('wrongpw');

  const { req, res } = fakeReqRes('DELETE', { rankingId: id, username: USER, password: WRONG_HASH });
  await admin.deleteRanking(req, res);

  assert.equal(res.statusCode, 401);
  assert.equal(await rankingExists(id), true, '랭킹이 그대로 있어야 함');
  assert.equal((await logsForTarget(id)).length, 0, '실패 로그도 남기지 않음');
});

test('인증정보 누락: DB 변경 전에 401', async (t) => {
  if (!dbAvailable) return t.skip('DB 연결 불가');
  const id = await insertRanking('nocreds');

  const { req, res } = fakeReqRes('DELETE', { rankingId: id });
  await admin.deleteRanking(req, res);

  assert.equal(res.statusCode, 401);
  assert.equal(await rankingExists(id), true);
  assert.equal((await logsForTarget(id)).length, 0);
});

test('위조된 username(유효 비밀번호 없음): 401', async (t) => {
  if (!dbAvailable) return t.skip('DB 연결 불가');
  const id = await insertRanking('fakeuser');

  const { req, res } = fakeReqRes('DELETE', {
    rankingId: id,
    username: `HACKER-${runId}`,
    password: PW_HASH, // 다른 사람 해시를 알아도 username 이 안 맞으면 실패
  });
  await admin.deleteRanking(req, res);

  assert.equal(res.statusCode, 401);
  assert.equal(await rankingExists(id), true);
  assert.equal((await logsForTarget(id)).length, 0);
});

test('adminUsername 위조 시도: 유효 자격증명이면 수행하되 로그는 검증된 username 으로만', async (t) => {
  if (!dbAvailable) return t.skip('DB 연결 불가');
  const id = await insertRanking('spoof');

  const { req, res } = fakeReqRes('DELETE', {
    rankingId: id,
    username: USER,
    password: PW_HASH,
    adminUsername: 'HACKER',
    requestedBy: 'HACKER',
    admin_id: 'HACKER',
  });
  await admin.deleteRanking(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(await rankingExists(id), false);
  const logs = await logsForTarget(id);
  assert.equal(logs.length, 1);
  assert.equal(logs[0].admin_id, USER, '위조된 HACKER 가 아니라 검증된 username 이어야 함');
});

test('잘못된 HTTP 메서드는 405 (인증 이전)', async (t) => {
  if (!dbAvailable) return t.skip('DB 연결 불가');
  const { req, res } = fakeReqRes('GET', {});
  await admin.deleteRanking(req, res);
  assert.equal(res.statusCode, 405);
});
