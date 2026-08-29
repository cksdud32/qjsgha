// 테스트 프로세스에 --import 로 주입되어, 어떤 테스트 모듈보다 먼저 실행된다.
// DATABASE_URL 이 운영 주소일 "가능성이 조금이라도" 있으면 즉시 프로세스를 죽인다.
//
//   node --import ./scripts/test/db-guard.mjs --test tests/**/*.test.js
//
// 규칙:
//   - DATABASE_URL 미설정: 통과 (통합 테스트는 각자 self-skip 한다).
//   - DATABASE_URL 설정: host 가 localhost/127.0.0.1/::1 이어야 하고,
//     POSTGRES_URL / PRISMA_DATABASE_URL 과 문자열이 같으면 안 된다.

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

function abort(msg) {
  console.error(`\n[db-guard] 운영 DB 접속 가능성 감지 → 테스트 중단: ${msg}\n`);
  process.exit(1);
}

const url = process.env.DATABASE_URL;
if (url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    abort('DATABASE_URL 을 URL 로 파싱할 수 없습니다.');
  }

  const host = parsed.hostname.replace(/^\[|\]$/g, '');
  if (!LOCAL_HOSTS.has(host)) {
    abort(`DATABASE_URL host 가 로컬이 아닙니다: ${host}`);
  }

  for (const name of ['POSTGRES_URL', 'PRISMA_DATABASE_URL']) {
    if (process.env[name] && process.env[name] === url) {
      abort(`DATABASE_URL 이 ${name}(운영 별칭) 과 동일합니다.`);
    }
  }

  console.log(`[db-guard] OK → DATABASE_URL host=${host} db=${parsed.pathname.replace(/^\//, '') || '(default)'}`);
}
