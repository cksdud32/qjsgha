// 테스트 전용 수동 SQL 적용기.
//
// 운영용 scripts/db/apply-manual-sql.js 는 절대 수정하지 않는다(그 스크립트의 기존
// 운영 마이그레이션 용도를 그대로 보존). 대신 이 래퍼에서만 다음을 강제한다:
//   1. 접속 문자열은 TEST_DATABASE_URL (또는 --db <url>) 로만 받는다.
//   2. host 가 localhost / 127.0.0.1 / ::1 이 아니면 즉시 중단.
//   3. 운영 별칭(POSTGRES_URL / PRISMA_DATABASE_URL / DATABASE_URL)과
//      문자열이 같거나 host 가 겹치면 즉시 중단.
//   4. 적용 전 host 와 DB 이름만 출력한다(사용자/비밀번호는 출력하지 않음).
//
// 사용법:
//   TEST_DATABASE_URL=postgres://user:pw@127.0.0.1:54329/qjsgha_test \
//     node scripts/test/apply-test-sql.mjs prisma/manual/0001_server_control_tables.sql [...]

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

function fail(msg) {
  console.error(`[apply-test-sql] 중단: ${msg}`);
  process.exit(1);
}

// TEST_DATABASE_URL(또는 --db) 를 해석하고 운영 DB 가 아님을 검증한다.
// 통과 시 { url, host, database } 반환, 실패 시 process.exit(1).
export function resolveTestDbUrl(argv = process.argv.slice(2)) {
  const dbFlagIndex = argv.indexOf('--db');
  const fromFlag = dbFlagIndex !== -1 ? argv[dbFlagIndex + 1] : undefined;
  const url = fromFlag || process.env.TEST_DATABASE_URL;
  if (!url) {
    fail('TEST_DATABASE_URL 환경변수(또는 --db <url>)가 필요합니다. 운영 URL 은 받지 않습니다.');
  }

  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    fail('접속 문자열을 URL 로 파싱할 수 없습니다.');
    return; // unreachable
  }

  const host = parsed.hostname.replace(/^\[|\]$/g, '');
  if (!LOCAL_HOSTS.has(host)) {
    fail(`테스트 DB host 가 로컬이 아닙니다: ${host} (localhost/127.0.0.1/::1 만 허용)`);
  }

  for (const name of ['POSTGRES_URL', 'PRISMA_DATABASE_URL', 'DATABASE_URL']) {
    const prod = process.env[name];
    if (!prod) continue;
    if (prod === url) {
      fail(`테스트 URL 이 ${name} 과 동일합니다. 운영 DB 로 의심되어 중단합니다.`);
    }
    let prodHost;
    try {
      prodHost = new URL(prod).hostname.replace(/^\[|\]$/g, '');
    } catch {
      continue;
    }
    if (prodHost === host && !LOCAL_HOSTS.has(prodHost)) {
      fail(`테스트 URL host 가 ${name} 의 host(${prodHost}) 와 겹칩니다.`);
    }
  }

  return { url, host, database: parsed.pathname.replace(/^\//, '') || '(default)' };
}

async function main() {
  const sqlFiles = process.argv.slice(2).filter((a) => a.toLowerCase().endsWith('.sql'));
  if (sqlFiles.length === 0) {
    fail('적용할 .sql 파일을 하나 이상 지정하세요.');
  }

  const { url, host, database } = resolveTestDbUrl();
  console.log(`[apply-test-sql] 대상 확인 → host=${host}  db=${database}`);
  console.log(`[apply-test-sql] 적용 파일: ${sqlFiles.join(', ')}`);

  const pool = new pg.Pool({ connectionString: url });
  const client = await pool.connect();
  try {
    for (const file of sqlFiles) {
      const sql = fs.readFileSync(path.resolve(file), 'utf8');
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('COMMIT');
      console.log(`[apply-test-sql] 적용 완료: ${file}`);
    }
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error(`[apply-test-sql] 적용 실패, 롤백함: ${error.message}`);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

const invokedDirectly = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (invokedDirectly) {
  await main();
}
