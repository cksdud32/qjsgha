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

-- api/admin.js 의 조회 액션(getSuggestions / getAllProblems / getAdminRanking)이
-- JOIN 하는 테이블들. 인증 테스트가 정상 조회 시 500 이 아니라 깔끔한 200 을 받도록.
CREATE TABLE IF NOT EXISTS "difficulty" (
  id         INT PRIMARY KEY,
  level_name TEXT,
  db_value   TEXT
);
INSERT INTO "difficulty" (id, level_name, db_value) VALUES
  (1, '쉬움', 'easy'), (2, '보통', 'medium'), (3, '어려움', 'hard'), (4, '하드코어', 'Hardcore')
  ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS "SuggestedQuestions" (
  id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name           TEXT,
  question_text  TEXT,
  answer         TEXT,
  question_text2 TEXT,
  question_text3 TEXT,
  difficulty_id  INT,
  status         TEXT DEFAULT 'pending',
  created_at     TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "questions" (
  id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  question_text  TEXT,
  answer         TEXT,
  question_text2 TEXT,
  question_text3 TEXT,
  difficulty_id  INT
);

-- api/admin.js 의 노래방 조회 액션(getPendingKaraoke / getKaraokeSongs)이 읽는 테이블.
CREATE TABLE IF NOT EXISTS "pending_karaoke" (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  track_title TEXT,
  tj_title    TEXT,
  tj_number   TEXT,
  nat_type    INT,
  is_cover    BOOLEAN
);

CREATE TABLE IF NOT EXISTS "karaoke_number" (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  song_title   TEXT,
  song_type    TEXT,
  number1      TEXT,
  number2      TEXT,
  lyrics_key1  TEXT,
  lyrics_label TEXT,
  lyrics_label2 TEXT
);
