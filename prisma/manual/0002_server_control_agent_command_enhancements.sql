-- 개인 서버 관리용 중앙 API 2차 보강: Agent heartbeat/상태보고, Command claim/timeout/idempotency.
--
-- 0001과 동일한 이유로 prisma migrate/db push 대신 수동 SQL로, 기존 테이블/데이터를 건드리지 않고
-- 추가(additive)로만 적용한다. prisma/schema.prisma의 Agent/Command/CommandLog 모델과 1:1로 맞춘다.

-- CommandStatus에 timeout 값 추가.
-- (같은 트랜잭션 안에서 새로 추가한 enum 값을 바로 사용할 수는 없지만, 이 스크립트는 값을 추가만 하고
--  사용하지는 않으므로 트랜잭션 안에서 실행해도 문제없다.)
ALTER TYPE "CommandStatus" ADD VALUE IF NOT EXISTS 'timeout';

-- Agent: heartbeat 이후 자체 보고하는 시스템 정보(POST /api/agent/status).
ALTER TABLE "agents" ADD COLUMN IF NOT EXISTS "hostname" TEXT;
ALTER TABLE "agents" ADD COLUMN IF NOT EXISTS "platform" TEXT;
ALTER TABLE "agents" ADD COLUMN IF NOT EXISTS "uptime" INTEGER;
ALTER TABLE "agents" ADD COLUMN IF NOT EXISTS "cpuUsage" DOUBLE PRECISION;
ALTER TABLE "agents" ADD COLUMN IF NOT EXISTS "memoryUsage" DOUBLE PRECISION;
CREATE INDEX IF NOT EXISTS "agents_lastSeenAt_idx" ON "agents"("lastSeenAt");

-- Command: 누가(claimedByAgentId) 언제(claimedAt) 선점했는지, 그리고 재시도 중복 생성 방지용 idempotencyKey.
ALTER TABLE "commands" ADD COLUMN IF NOT EXISTS "claimedByAgentId" TEXT REFERENCES "agents"("id");
ALTER TABLE "commands" ADD COLUMN IF NOT EXISTS "claimedAt" TIMESTAMP(3);
ALTER TABLE "commands" ADD COLUMN IF NOT EXISTS "idempotencyKey" TEXT;

CREATE INDEX IF NOT EXISTS "commands_createdAt_idx" ON "commands"("createdAt");
CREATE INDEX IF NOT EXISTS "commands_claimedByAgentId_idx" ON "commands"("claimedByAgentId");

-- idempotencyKey는 값이 있을 때만(NULL은 서로 달라도 되므로) 유일해야 한다.
-- 일반 UNIQUE 제약이면 충분하다(Postgres는 NULL끼리 중복으로 보지 않는다).
CREATE UNIQUE INDEX IF NOT EXISTS "commands_idempotencyKey_key" ON "commands"("idempotencyKey");

-- 같은 프로젝트에 pending 또는 processing 명령이 동시에 최대 1개만 존재하도록 하는 partial unique index.
-- start/stop/restart 요청 두 개가 거의 동시에 들어와도(경합 상태) DB가 최종 방어선이 되어준다.
-- Prisma 스키마에는 partial index를 표현할 수 없어 여기에만 존재한다.
CREATE UNIQUE INDEX IF NOT EXISTS "commands_active_project_unique"
  ON "commands"("projectId")
  WHERE "status" IN ('pending', 'processing');

-- CommandLog: 프로젝트/에이전트 기준으로도 조회할 수 있도록 비정규화 필드 추가(둘 다 선택값).
ALTER TABLE "command_logs" ADD COLUMN IF NOT EXISTS "projectId" TEXT;
ALTER TABLE "command_logs" ADD COLUMN IF NOT EXISTS "agentId" TEXT REFERENCES "agents"("id");
