// 통합 테스트: Command 전체 수명주기 + CommandLog 기록 확인.
// 기존 commandService.integration.test.js 가 다루지 않는 부분을 채운다:
//   - success / failed / cancel / timeout 각각에서 CommandLog 이벤트가 남는지
//   - markCommandFinished 의 'failed' 경로
//
// 규칙: 실제 DATABASE_URL, DB 없으면 skip, test- 접두사 정리.

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

let prisma, commandService;
let dbAvailable = true;
const runId = Date.now();
let agent, project;

async function logsFor(commandId) {
  return prisma.commandLog.findMany({ where: { commandId }, orderBy: { createdAt: 'asc' } });
}
function hasEvent(logs, event) {
  return logs.some((l) => l.message.includes(`[${event}]`));
}

before(async () => {
  try {
    ({ prisma } = await import('../server/db.js'));
    commandService = await import('../server/services/commandService.js');
    const agentService = await import('../server/services/agentService.js');
    const projectService = await import('../server/services/projectService.js');
    await prisma.$queryRaw`SELECT 1`;

    agent = await agentService.createAgent({ name: `test-agent-flow-${runId}` });
    project = await projectService.createProject({
      id: `test-proj-flow-${runId}`,
      name: 'Flow Project',
      type: 'worker',
      agentId: agent.id,
    });
  } catch (error) {
    console.warn('[commandFlow.integration.test] DB 연결 불가, 건너뜁니다:', error.message);
    dbAvailable = false;
  }
});

after(async () => {
  if (!dbAvailable) return;
  if (project) {
    const ids = (
      await prisma.command.findMany({ where: { projectId: project.id }, select: { id: true } })
    ).map((c) => c.id);
    await prisma.commandLog.deleteMany({ where: { commandId: { in: ids } } });
    await prisma.command.deleteMany({ where: { projectId: project.id } });
    await prisma.project.delete({ where: { id: project.id } }).catch(() => {});
  }
  if (agent) await prisma.agent.delete({ where: { id: agent.id } }).catch(() => {});
  await prisma.$disconnect();
});

test('생성→claim→success: CommandLog 에 CREATED / CLAIMED / SUCCEEDED', async (t) => {
  if (!dbAvailable) return t.skip('DB 연결 불가');

  const cmd = await commandService.requestControlCommand({
    projectId: project.id, action: 'start', source: 'web', requestedBy: 'tester',
  });
  assert.equal(cmd.status, 'pending');
  assert.ok(hasEvent(await logsFor(cmd.id), 'COMMAND_CREATED'));

  const claimed = await commandService.markCommandProcessing(cmd.id, agent.id);
  assert.equal(claimed.status, 'processing');
  assert.equal(claimed.claimedByAgentId, agent.id);
  assert.ok(hasEvent(await logsFor(cmd.id), 'COMMAND_CLAIMED'));

  const done = await commandService.markCommandFinished(cmd.id, 'success', null, agent.id);
  assert.equal(done.status, 'success');
  assert.ok(done.finishedAt, 'finishedAt 기록');
  assert.ok(hasEvent(await logsFor(cmd.id), 'COMMAND_SUCCEEDED'));
});

test('생성→claim→failed: status=failed + errorMessage + CommandLog FAILED(level error)', async (t) => {
  if (!dbAvailable) return t.skip('DB 연결 불가');

  const cmd = await commandService.requestControlCommand({
    projectId: project.id, action: 'restart', source: 'discord', requestedBy: 'tester',
  });
  await commandService.markCommandProcessing(cmd.id, agent.id);

  const failed = await commandService.markCommandFinished(cmd.id, 'failed', 'boom', agent.id);
  assert.equal(failed.status, 'failed');
  assert.equal(failed.errorMessage, 'boom');

  const logs = await logsFor(cmd.id);
  assert.ok(hasEvent(logs, 'COMMAND_FAILED'));
  const failLog = logs.find((l) => l.message.includes('[COMMAND_FAILED]'));
  assert.equal(failLog.level, 'error');
  assert.ok(failLog.message.includes('boom'), 'errorMessage 가 로그에 포함');
});

test('생성→cancel: status=cancelled + CommandLog CANCELLED', async (t) => {
  if (!dbAvailable) return t.skip('DB 연결 불가');

  const cmd = await commandService.requestControlCommand({
    projectId: project.id, action: 'stop', source: 'system',
  });
  const cancelled = await commandService.cancelPendingCommand(cmd.id, 'tester');
  assert.equal(cancelled.status, 'cancelled');
  assert.ok(hasEvent(await logsFor(cmd.id), 'COMMAND_CANCELLED'));
});

test('processing 오래 방치 → timeoutStaleCommands: status=timeout + CommandLog TIMEOUT', async (t) => {
  if (!dbAvailable) return t.skip('DB 연결 불가');

  const stale = await prisma.command.create({
    data: {
      projectId: project.id, action: 'restart', source: 'system', status: 'processing',
      startedAt: new Date(Date.now() - 700 * 1000),
      claimedByAgentId: agent.id, claimedAt: new Date(Date.now() - 700 * 1000),
    },
  });

  const timedOut = await commandService.timeoutStaleCommands();
  assert.ok(timedOut.includes(stale.id));

  const after = await prisma.command.findUnique({ where: { id: stale.id } });
  assert.equal(after.status, 'timeout');
  assert.equal(after.errorMessage, 'COMMAND_TIMEOUT');
  assert.ok(hasEvent(await logsFor(stale.id), 'COMMAND_TIMEOUT'));
});

test('source 검증: 잘못된 source 는 400', async (t) => {
  if (!dbAvailable) return t.skip('DB 연결 불가');
  await assert.rejects(
    () => commandService.requestControlCommand({ projectId: project.id, action: 'start', source: 'bogus' }),
    (err) => err.status === 400 && err.code === 'VALIDATION_ERROR'
  );
});
