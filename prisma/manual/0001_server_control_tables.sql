-- 개인 서버 관리용 중앙 API 테이블 (Project / Agent / Command / CommandLog)
--
-- 이 프로젝트의 DB는 Prisma 마이그레이션 히스토리로 관리되지 않고(테이블 대부분이
-- 원시 SQL로 직접 생성됨) `prisma migrate` / `prisma db push`를 실행하면 schema.prisma에
-- 없는 기존 테이블(AdminUsers, concert, quiz_ranking 등 운영 데이터 포함)을 전부 drop하려고
-- 시도한다. 그래서 이 4개 테이블은 반드시 이 SQL을 통해 수동으로, 추가(additive)로만 생성한다.
-- prisma/schema.prisma의 Agent/Project/Command/CommandLog 모델과 컬럼/타입이 1:1로 일치해야 한다.

CREATE TYPE "ProjectStatus" AS ENUM ('running', 'stopped', 'starting', 'stopping', 'restarting', 'error', 'unknown');
CREATE TYPE "CommandAction" AS ENUM ('start', 'stop', 'restart');
CREATE TYPE "CommandStatus" AS ENUM ('pending', 'processing', 'success', 'failed', 'cancelled');
CREATE TYPE "CommandSource" AS ENUM ('web', 'discord', 'system');
CREATE TYPE "AgentStatus" AS ENUM ('online', 'offline', 'unknown');
CREATE TYPE "LogLevel" AS ENUM ('info', 'warn', 'error');

CREATE TABLE "agents" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL UNIQUE,
  "status" "AgentStatus" NOT NULL DEFAULT 'unknown',
  "lastSeenAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "projects" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "status" "ProjectStatus" NOT NULL DEFAULT 'unknown',
  "port" INTEGER,
  "type" TEXT NOT NULL,
  "processName" TEXT,
  "agentId" TEXT REFERENCES "agents"("id"),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastSeenAt" TIMESTAMP(3)
);
CREATE INDEX "projects_agentId_idx" ON "projects"("agentId");

CREATE TABLE "commands" (
  "id" TEXT PRIMARY KEY,
  "action" "CommandAction" NOT NULL,
  "status" "CommandStatus" NOT NULL DEFAULT 'pending',
  "projectId" TEXT NOT NULL REFERENCES "projects"("id"),
  "requestedBy" TEXT,
  "source" "CommandSource" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "startedAt" TIMESTAMP(3),
  "finishedAt" TIMESTAMP(3),
  "errorMessage" TEXT
);
CREATE INDEX "commands_projectId_idx" ON "commands"("projectId");
CREATE INDEX "commands_status_idx" ON "commands"("status");

CREATE TABLE "command_logs" (
  "id" TEXT PRIMARY KEY,
  "commandId" TEXT NOT NULL REFERENCES "commands"("id"),
  "level" "LogLevel" NOT NULL DEFAULT 'info',
  "message" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "command_logs_commandId_idx" ON "command_logs"("commandId");
