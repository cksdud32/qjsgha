// lib/db.js 는 import 시점에 연결 문자열(DATABASE_URL / POSTGRES_URL / PRISMA_DATABASE_URL)이
// 하나도 없으면 throw 한다. 그래서 lib/db.js 를 간접적으로 import 하는 순수 단위 테스트
// (실제 쿼리는 하지 않음)도 모듈 로드 단계에서 죽는다.
//
// 여기서는 "아무 연결 문자열도 없을 때만" 절대 접속되지 않는 로컬 더미 값을 넣는다.
//   - pg.Pool 은 lazy 라서 첫 쿼리 전까지 실제 연결을 만들지 않는다.
//   - 포트 1 / placeholder 자격증명이라 실수로 쿼리해도 운영 어디에도 닿지 않는다.
// 실제 통합 테스트는 with-test-db.mjs 가 진짜 로컬 DATABASE_URL 을 먼저 넣어주므로
// 이 값이 사용되지 않는다.

if (!process.env.DATABASE_URL && !process.env.POSTGRES_URL && !process.env.PRISMA_DATABASE_URL) {
  process.env.DATABASE_URL = 'postgres://placeholder:placeholder@127.0.0.1:1/placeholder';
}
