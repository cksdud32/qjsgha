// 목적: 단위 테스트(및 기본 `npm test`)가 절대 운영 DB 로 향하지 않도록 강제한다.
//
// lib/db.js 는 import 시점에 연결 문자열(DATABASE_URL → POSTGRES_URL → PRISMA_DATABASE_URL
// 순서로 탐색)이 하나도 없으면 throw 하고, 있으면 그 값으로 pg.Pool 을 만든다.
// 그래서 .env 나 셸에 운영 POSTGRES_URL 이 있으면 lib/db.js 를 간접 import 하는 테스트가
// 운영을 가리키는 풀을 만들 수 있다(쿼리 전까지 실제 접속은 없지만, 안전하지 않다).
//
// 여기서는 DATABASE_URL 을 다음 규칙으로 정규화한다:
//   - 이미 로컬(localhost / 127.0.0.1 / ::1)이면 그대로 둔다
//     → with-test-db.mjs 가 넣어준 격리 인스턴스 URL 은 살아남는다.
//   - 없거나, 로컬이 아니면 접속 불가한 로컬 더미로 덮어쓴다.
//     → lib/db.js 는 DATABASE_URL 을 최우선으로 보므로 POSTGRES_URL /
//       PRISMA_DATABASE_URL 폴백(운영)도 함께 무력화된다.
//   포트 1 / placeholder 자격증명이라 실수로 쿼리해도 운영 어디에도 닿지 않는다.

const PLACEHOLDER = 'postgres://placeholder:placeholder@127.0.0.1:1/placeholder';
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

function isLocalUrl(value) {
  try {
    return LOCAL_HOSTS.has(new URL(value).hostname.replace(/^\[|\]$/g, ''));
  } catch {
    return false;
  }
}

if (!process.env.DATABASE_URL || !isLocalUrl(process.env.DATABASE_URL)) {
  process.env.DATABASE_URL = PLACEHOLDER;
}
