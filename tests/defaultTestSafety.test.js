// 음성 테스트: 운영 연결 문자열이 환경에 있어도 기본 `npm test` 경로가 운영 DB 에
// 접속·쓰기 하지 않음을 증명한다. (DB 불필요, 항상 실행됨 — test:full 의 glob 에 잡힌다)

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(fileURLToPath(import.meta.url), '../..');
const SENTINEL = 'postgres://u:p@sentinel-prod.invalid:5432/live';

// 이 파일은 node --test 아래에서 돈다. 그대로 spawn 하면 NODE_TEST_CONTEXT 가
// 자식에게 상속돼 자식 --test 가 TAP 대신 IPC 직렬화 포맷으로 출력한다. 제거한다.
function baseEnv(extra) {
  const env = { ...process.env, ...extra };
  delete env.NODE_TEST_CONTEXT;
  delete env.NODE_OPTIONS;
  return env;
}

function parseTestScript() {
  const pkg = JSON.parse(readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  return pkg.scripts.test;
}

test('package.json 의 test 스크립트는 운영 .env 를 로드하지도, 통합 테스트를 포함하지도 않는다', () => {
  const cmd = parseTestScript();
  assert.ok(!cmd.includes('dotenv/config'), 'npm test 는 --import dotenv/config (.env=운영 URL) 를 쓰면 안 된다');
  assert.ok(!/tests\/\*\*|integration/i.test(cmd), 'npm test 는 통합 테스트를 포함하면 안 된다');
  assert.ok(cmd.includes('db-guard'), 'npm test 는 db-guard 를 거쳐야 한다');
  assert.ok(cmd.includes('unit-setup'), 'npm test 는 unit-setup 을 거쳐야 한다');
});

test('운영 POSTGRES_URL / PRISMA_DATABASE_URL 이 설정돼 있어도 npm test 는 통과하고 그 host 를 건드리지 않는다', () => {
  const cmd = parseTestScript();
  // "node <args...>" 를 인자 배열로 분해 (따옴표 제거)
  const args = cmd
    .replace(/^node\s+/, '')
    .match(/(?:[^\s"]+|"[^"]*")+/g)
    .map((a) => a.replace(/^"|"$/g, ''));

  const res = spawnSync(process.execPath, args, {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: 90_000,
    env: baseEnv({
      DATABASE_URL: '',
      POSTGRES_URL: SENTINEL,
      PRISMA_DATABASE_URL: SENTINEL,
      DATABASE_SSL: '',
    }),
  });

  const output = `${res.stdout || ''}\n${res.stderr || ''}`;
  assert.equal(res.status, 0, `npm test 가 실패함:\n${output}`);
  assert.ok(!output.includes('sentinel-prod.invalid'), `운영 host 접속/언급 흔적이 있음:\n${output}`);
  assert.match(output, /# pass \d+/);
  assert.doesNotMatch(output, /# fail [1-9]/);
});

test('운영 POSTGRES_URL 이 설정돼 있어도 lib/db.js 는 로컬 더미로만 풀을 만든다', () => {
  const res = spawnSync(
    process.execPath,
    ['--import', './scripts/test/unit-setup.mjs', './scripts/test/_print-db-cs.mjs'],
    {
      cwd: ROOT,
      encoding: 'utf8',
      timeout: 30_000,
      env: baseEnv({ DATABASE_URL: '', POSTGRES_URL: SENTINEL, PRISMA_DATABASE_URL: SENTINEL }),
    }
  );
  assert.equal(res.status, 0, res.stderr);
  assert.match(res.stdout, /127\.0\.0\.1:1\b/, `lib/db.js 가 로컬 더미가 아닌 곳을 가리킴: ${res.stdout}`);
  assert.ok(!res.stdout.includes('sentinel-prod.invalid'), `운영 URL 이 새어나옴: ${res.stdout}`);
});
