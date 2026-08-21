// 애플리케이션 전체에서 쓰는 단 하나의 PostgreSQL 접근 계층.
//
// API 라우트는 여기서 export 하는 pool 만 가져다 쓴다.
// DB 를 옮길 때 바꾸는 것은 코드가 아니라 환경변수뿐이다.
//
//   DATABASE_URL          postgres://user:password@host:5432/dbname
//   DATABASE_SSL          no-verify(기본) | disable | require | verify-full
//   DATABASE_SSL_CA       자체 서명 인증서를 쓸 때만 (PEM 본문)
//   DB_POOL_MAX           풀 최대 커넥션 수 (미설정 시 pg 기본값)
//   DB_IDLE_TIMEOUT_MS    유휴 커넥션 정리 시간 (ms)
//   DB_CONNECT_TIMEOUT_MS 연결 타임아웃 (ms)
//
// 공급자별 분기(if vercel / if server)는 두지 않는다.

import pg from 'pg';

const { Pool } = pg;

// DATABASE_URL 을 기본 이름으로 삼되, 기존에 쓰던 이름도 그대로 인정한다.
// 덕분에 Vercel 환경변수를 지금 당장 바꾸지 않아도 동작이 동일하다.
function resolveConnectionString() {
  const url =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.PRISMA_DATABASE_URL;

  if (!url) {
    throw new Error(
      'DB 연결 문자열이 없습니다. DATABASE_URL 환경변수를 설정하세요.'
    );
  }
  return url;
}

// SSL 설정을 환경변수로 뺀다.
// 기본값 no-verify 는 지금까지 쓰던 { rejectUnauthorized: false } 와 동일하므로
// 환경변수를 추가하지 않는 한 현재 동작이 전혀 바뀌지 않는다.
// 서버컴의 사설망 PostgreSQL 처럼 TLS 가 없는 곳으로 옮길 때는 DATABASE_SSL=disable 만 주면 된다.
function resolveSsl() {
  const mode = (process.env.DATABASE_SSL || 'no-verify').toLowerCase();

  if (mode === 'disable' || mode === 'false' || mode === 'off') return false;

  if (mode === 'require' || mode === 'verify-full' || mode === 'verify-ca') {
    const ca = process.env.DATABASE_SSL_CA;
    return ca ? { rejectUnauthorized: true, ca } : { rejectUnauthorized: true };
  }

  // no-verify: 암호화는 하되 인증서 검증은 하지 않음 (현재 동작)
  return { rejectUnauthorized: false };
}

function toInt(value) {
  const n = Number.parseInt(value ?? '', 10);
  return Number.isFinite(n) ? n : undefined;
}

function buildPool() {
  const config = {
    connectionString: resolveConnectionString(),
    ssl: resolveSsl(),
  };

  // 값이 있을 때만 넣는다. 미설정이면 pg 기본값을 그대로 쓴다.
  const max = toInt(process.env.DB_POOL_MAX);
  if (max !== undefined) config.max = max;

  const idleTimeoutMillis = toInt(process.env.DB_IDLE_TIMEOUT_MS);
  if (idleTimeoutMillis !== undefined) config.idleTimeoutMillis = idleTimeoutMillis;

  const connectionTimeoutMillis = toInt(process.env.DB_CONNECT_TIMEOUT_MS);
  if (connectionTimeoutMillis !== undefined) {
    config.connectionTimeoutMillis = connectionTimeoutMillis;
  }

  const created = new Pool(config);

  // 유휴 커넥션이 서버 쪽에서 끊겨도 프로세스가 죽지 않도록 한다.
  created.on('error', (err) => {
    console.error('[db] idle client error:', err.message);
  });

  return created;
}

// serverless 에서는 인스턴스가 재사용되므로 모듈 스코프 캐시만으로도 대개 충분하지만,
// 한 인스턴스에 여러 라우트 모듈이 올라오거나 로컬에서 핫리로드가 걸리는 경우
// 풀이 중복 생성되는 것을 globalThis 캐시로 막는다.
const globalForDb = globalThis;

export const pool = globalForDb.__qjsghaPgPool ?? buildPool();

if (!globalForDb.__qjsghaPgPool) {
  globalForDb.__qjsghaPgPool = pool;
}

// 짧은 단발성 쿼리용 헬퍼. pool.query 와 동작이 같다.
export function query(text, params) {
  return pool.query(text, params);
}

export default pool;
