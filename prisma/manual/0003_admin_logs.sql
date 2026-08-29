-- 관리자 감사 로그 테이블 (admin_logs)
--
-- 0001 / 0002 와 동일한 이유로 prisma migrate / db push 대신 수동 SQL 로,
-- 기존 테이블/데이터를 건드리지 않고 추가(additive)로만 적용한다.
--
-- lib/admin-log.js 의 writeAdminLog() 는 INSERT 시 다음 6개 컬럼만 넘긴다:
--   (admin_id, action, target_type, target_id, details, status)
-- id 와 created_at 은 값을 넘기지 않으므로 반드시 DB 기본값으로 자동 생성되어야 한다.
--   - id         : BIGINT GENERATED ALWAYS AS IDENTITY  (앱에서 id 를 만들지 않음)
--   - created_at : DEFAULT now()
-- details 는 lib/admin-log.js 가 JSON.stringify 한 문자열을 넘기므로 jsonb 로 저장된다.
-- api/admin-logs.js 는 action / admin_id / status / created_at(from,to) 로 필터하고
-- created_at DESC 로 정렬하므로 해당 컬럼에 인덱스를 둔다.

CREATE TABLE IF NOT EXISTS admin_logs (
  "id"          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "admin_id"    TEXT NOT NULL DEFAULT 'unknown',
  "action"      TEXT NOT NULL,
  "target_type" TEXT,
  "target_id"   TEXT,
  "details"     JSONB,
  "status"      TEXT NOT NULL DEFAULT 'success',
  "created_at"  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "admin_logs_created_at_idx" ON admin_logs ("created_at" DESC);
CREATE INDEX IF NOT EXISTS "admin_logs_action_idx"     ON admin_logs ("action");
CREATE INDEX IF NOT EXISTS "admin_logs_admin_id_idx"   ON admin_logs ("admin_id");
