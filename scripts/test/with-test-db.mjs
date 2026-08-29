// 격리된 일회용 PostgreSQL(embedded-postgres, 번들된 PG 18) 위에서 전체 테스트를 돌린다.
//
// 안전 규칙 (사용자 요구사항):
//   - 운영 DB / 운영 Discord 에는 절대 연결하지 않는다.
//   - 이 스크립트는 운영 .env 자격증명을 스스로 읽지 않는다. 접속 문자열을
//     여기서 127.0.0.1 로만 새로 만든다.
//   - 테스트 자식 프로세스에는 DATABASE_URL = (이 로컬 인스턴스) 만 넘기고,
//     scripts/test/db-guard.mjs 가 한 번 더 로컬 여부를 검증한다.
//   - 끝나면(성공/실패 무관) 인스턴스를 정지하고 데이터 디렉터리를 삭제한다.
//
// 사용법:  node scripts/test/with-test-db.mjs

import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import EmbeddedPostgres from 'embedded-postgres';

const ROOT = path.resolve(fileURLToPath(import.meta.url), '../../..');
const DATA_DIR = path.join(os.tmpdir(), 'qjsgha-test-pg');
const PORT = Number(process.env.TEST_PG_PORT) || 54329;
const DB_NAME = 'qjsgha_test';
const PASSWORD = randomBytes(18).toString('base64url'); // 로그로 출력하지 않는다

const MIGRATIONS = [
  'prisma/manual/0001_server_control_tables.sql',
  'prisma/manual/0002_server_control_agent_command_enhancements.sql',
  'prisma/manual/0003_admin_logs.sql',
];

function run(cmd, args, env) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { cwd: ROOT, stdio: 'inherit', env, shell: false });
    child.on('close', (code) => resolve(code ?? 1));
  });
}

async function rmDataDir() {
  await fs.promises.rm(DATA_DIR, { recursive: true, force: true }).catch(() => {});
}

let pg;
let stopped = false;
async function shutdown() {
  if (stopped) return;
  stopped = true;
  try {
    if (pg) await pg.stop();
  } catch (err) {
    console.error('[with-test-db] 정지 중 오류(무시):', err?.message);
  }
  await rmDataDir();
}

process.on('SIGINT', () => shutdown().finally(() => process.exit(130)));
process.on('SIGTERM', () => shutdown().finally(() => process.exit(143)));

async function main() {
  // 운영 DATABASE_URL 이 이 프로세스 환경에 이미 있다면(있어선 안 됨) 제거한다.
  delete process.env.DATABASE_URL;

  await rmDataDir();
  await fs.promises.mkdir(DATA_DIR, { recursive: true });

  pg = new EmbeddedPostgres({
    databaseDir: DATA_DIR,
    user: 'postgres',
    password: PASSWORD,
    port: PORT,
    authMethod: 'scram-sha-256',
    persistent: false,
    onLog: () => {},
    onError: (m) => console.error('[pg]', typeof m === 'string' ? m : m?.message ?? m),
  });

  console.log(`[with-test-db] 임시 PostgreSQL 초기화 중... (dir=${DATA_DIR})`);
  await pg.initialise();
  await pg.start();
  await pg.createDatabase(DB_NAME);

  const testUrl = `postgres://postgres:${encodeURIComponent(PASSWORD)}@127.0.0.1:${PORT}/${DB_NAME}`;

  // 사용자 검증용 출력: host 와 DB 이름만. 비밀번호/토큰은 출력하지 않는다.
  console.log('');
  console.log('──────────────────────────────────────────────');
  console.log(`[with-test-db] 테스트 대상 DB  host=127.0.0.1  port=${PORT}  db=${DB_NAME}`);
  console.log('[with-test-db] (운영 DB 아님: 로컬 임시 인스턴스, 종료 시 삭제)');
  console.log('──────────────────────────────────────────────');
  console.log('');

  // 1) 마이그레이션 적용 — 반드시 guarded 래퍼를 통해서만.
  const applyEnv = { ...process.env, TEST_DATABASE_URL: testUrl };
  const applyCode = await run(process.execPath, [
    path.join(ROOT, 'scripts/test/apply-test-sql.mjs'),
    ...MIGRATIONS,
  ], applyEnv);
  if (applyCode !== 0) {
    throw new Error(`마이그레이션 적용 실패 (exit ${applyCode})`);
  }

  // 2) 전체 테스트 실행 — DATABASE_URL 은 이 로컬 인스턴스로만.
  const testEnv = {
    ...process.env,
    DATABASE_URL: testUrl,
    // 임시 PostgreSQL 은 SSL 미설정. lib/db.js 는 기본이 no-verify(SSL on) 라서
    // 명시적으로 꺼야 pg 커넥션이 붙는다. (Prisma 경로는 URL 에 sslmode 가 없어 무관)
    DATABASE_SSL: 'disable',
    AGENT_API_TOKEN: 'test-agent-token-local',
    NODE_ENV: 'test',
  };
  const importUrl = (rel) => pathToFileURL(path.join(ROOT, rel)).href;
  const testCode = await run(process.execPath, [
    '--import', importUrl('scripts/test/unit-setup.mjs'),
    '--import', 'dotenv/config',
    '--import', importUrl('scripts/test/db-guard.mjs'),
    '--test',
    'tests/**/*.test.js',
  ], testEnv);

  return testCode;
}

let exitCode = 1;
try {
  exitCode = await main();
} catch (err) {
  console.error('[with-test-db] 실패:', err?.stack || err?.message || err);
  exitCode = 1;
} finally {
  await shutdown();
}
process.exit(exitCode);
