-- 테스트 전용: 격리 DB 에 "레거시" 테이블의 최소 스켈레톤을 만든다.
--
-- 운영 DB 에는 이미 있는 테이블들이지만(0001~0003 서버제어 마이그레이션에는 없음),
-- 감사 로그 / 관리자 인증 통합 테스트가 이들을 필요로 한다.
-- with-test-db.mjs 가 마이그레이션 직후 "한 번만" 적용하므로, 테스트 파일들이
-- 각자 CREATE TABLE IF NOT EXISTS 를 병렬로 돌리다 카탈로그 경합(pg_type_typname_nsp_index)
-- 을 일으키는 문제를 피한다. 테스트는 여기 만들어진 테이블에 INSERT 만 한다.

CREATE TABLE IF NOT EXISTS "AdminUsers" (
  id       SERIAL PRIMARY KEY,
  username TEXT UNIQUE,
  password TEXT
);

CREATE TABLE IF NOT EXISTS "quiz_ranking" (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name          TEXT,
  score         INT,
  difficulty_id INT,
  created_at    TIMESTAMPTZ DEFAULT now()
);
