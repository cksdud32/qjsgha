// 통합 테스트: 별도 테스트 DB가 없는 개인 프로젝트라 실제 DB(DATABASE_URL)에 대해 실행된다.
// 생성하는 모든 row는 이름/id에 `test-`(runId 포함) 접두사를 붙이고 after()에서 확실히 정리한다.
// DB 연결이 없으면(로컬에 .env가 없는 등) 각 테스트를 t.skip()으로 건너뛴다.

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

let prisma, commandService, agentService, projectService;
let dbAvailable = true;

const runId = Date.now();
let agentA, agentB, project, project2;

before(async () => {
  try {
    ({ prisma } = await import('../server/db.js'));
    commandService = await import('../server/services/commandService.js');
    agentService = await import('../server/services/agentService.js');
    projectService = await import('../server/services/projectService.js');
    await prisma.$queryRaw`SELECT 1`;

    agentA = await agentService.createAgent({ name: `test-agent-a-${runId}` });
    agentB = await agentService.createAgent({ name: `test-agent-b-${runId}` });
    project = await projectService.createProject({
      id: `test-proj-${runId}`,
      name: 'Test Project',
      type: 'worker',
      agentId: agentA.id
    });
    project2 = await projectService.createProject({
      id: `test-proj2-${runId}`,
      name: 'Test Project 2',
      type: 'worker',
      agentId: agentA.id
    });
  } catch (error) {
    console.warn('[commandService.integration.test] DB 연결 불가, 통합 테스트를 건너뜁니다:', error.message);
    dbAvailable = false;
  }
});

after(async () => {
  if (!dbAvailable) return;
  for (const p of [project, project2]) {
    if (!p) continue;
    const ids = (await prisma.command.findMany({ where: { projectId: p.id }, select: { id: true } })).map((c) => c.id);
    await prisma.commandLog.deleteMany({ where: { commandId: { in: ids } } });
    await prisma.command.deleteMany({ where: { projectId: p.id } });
    await prisma.project.delete({ where: { id: p.id } }).catch(() => {});
  }
  if (agentA) await prisma.agent.delete({ where: { id: agentA.id } }).catch(() => {});
  if (agentB) await prisma.agent.delete({ where: { id: agentB.id } }).catch(() => {});
  await prisma.$disconnect();
});

test('project에 pending/processing 명령이 있으면 새 명령은 409', async (t) => {
  if (!dbAvailable) return t.skip('DB 연결 불가');

  const command = await commandService.requestControlCommand({
    projectId: project.id,
    action: 'restart',
    source: 'system',
    requestedBy: 'test'
  });
  assert.equal(command.status, 'pending');

  await assert.rejects(
    () =>
      commandService.requestControlCommand({
        projectId: project.id,
        action: 'start',
        source: 'system',
        requestedBy: 'test'
      }),
    (err) => err.code === 'PROJECT_COMMAND_IN_PROGRESS'
  );

  // 정리: 다음 테스트를 위해 완료시켜 둔다.
  await commandService.markCommandProcessing(command.id, agentA.id);
  await commandService.markCommandFinished(command.id, 'success', null, agentA.id);
});

test('Agent B는 Agent A 프로젝트의 명령을 처리할 수 없다', async (t) => {
  if (!dbAvailable) return t.skip('DB 연결 불가');

  const command = await commandService.requestControlCommand({
    projectId: project.id,
    action: 'restart',
    source: 'system',
    requestedBy: 'test'
  });

  await assert.rejects(
    () => commandService.markCommandProcessing(command.id, agentB.id),
    (err) => err.code === 'AGENT_PROJECT_MISMATCH' && err.status === 403
  );

  // 소유 Agent는 정상 처리 가능해야 한다.
  const claimed = await commandService.markCommandProcessing(command.id, agentA.id);
  assert.equal(claimed.status, 'processing');
  await commandService.markCommandFinished(command.id, 'success', null, agentA.id);
});

test('같은 Command를 동시에 claim하면 한쪽만 성공한다', async (t) => {
  if (!dbAvailable) return t.skip('DB 연결 불가');

  const command = await prisma.command.create({
    data: { projectId: project2.id, action: 'stop', source: 'system', status: 'pending' }
  });

  const results = await Promise.allSettled([
    commandService.markCommandProcessing(command.id, agentA.id),
    commandService.markCommandProcessing(command.id, agentA.id)
  ]);

  const fulfilled = results.filter((r) => r.status === 'fulfilled');
  const rejected = results.filter((r) => r.status === 'rejected');
  assert.equal(fulfilled.length, 1);
  assert.equal(rejected.length, 1);
  assert.equal(rejected[0].reason.code, 'INVALID_STATE_TRANSITION');

  await commandService.markCommandFinished(command.id, 'success', null, agentA.id);
});

test('Command 상태 전이: pending -> processing -> success, success -> processing은 거부', async (t) => {
  if (!dbAvailable) return t.skip('DB 연결 불가');

  const command = await commandService.requestControlCommand({
    projectId: project.id,
    action: 'restart',
    source: 'system',
    requestedBy: 'test'
  });
  await commandService.markCommandProcessing(command.id, agentA.id);
  const finished = await commandService.markCommandFinished(command.id, 'success', null, agentA.id);
  assert.equal(finished.status, 'success');

  await assert.rejects(
    () => commandService.markCommandProcessing(command.id, agentA.id),
    (err) => err.code === 'INVALID_STATE_TRANSITION'
  );
});

test('pending 명령은 취소 가능하고, 취소된 명령은 다시 취소할 수 없다', async (t) => {
  if (!dbAvailable) return t.skip('DB 연결 불가');

  const command = await commandService.requestControlCommand({
    projectId: project.id,
    action: 'start',
    source: 'system',
    requestedBy: 'test'
  });

  const cancelled = await commandService.cancelPendingCommand(command.id, 'tester');
  assert.equal(cancelled.status, 'cancelled');

  await assert.rejects(
    () => commandService.cancelPendingCommand(command.id, 'tester'),
    (err) => err.code === 'INVALID_STATE_TRANSITION'
  );
});

test('processing 중인 명령은 취소할 수 없다 (409)', async (t) => {
  if (!dbAvailable) return t.skip('DB 연결 불가');

  const command = await commandService.requestControlCommand({
    projectId: project.id,
    action: 'restart',
    source: 'system',
    requestedBy: 'test'
  });
  await commandService.markCommandProcessing(command.id, agentA.id);

  await assert.rejects(
    () => commandService.cancelPendingCommand(command.id, 'tester'),
    (err) => err.code === 'INVALID_STATE_TRANSITION'
  );

  await commandService.markCommandFinished(command.id, 'success', null, agentA.id);
});

test('같은 Idempotency-Key로 재요청하면 기존 Command를 반환한다', async (t) => {
  if (!dbAvailable) return t.skip('DB 연결 불가');

  const key = `idem-${runId}`;
  const first = await commandService.requestControlCommand({
    projectId: project.id,
    action: 'start',
    source: 'system',
    requestedBy: 'test',
    idempotencyKey: key
  });
  const second = await commandService.requestControlCommand({
    projectId: project.id,
    action: 'start',
    source: 'system',
    requestedBy: 'test',
    idempotencyKey: key
  });
  assert.equal(first.id, second.id);

  await commandService.cancelPendingCommand(first.id, 'tester');
});

test('오래 processing 상태에 머문 명령은 timeout으로 정리된다', async (t) => {
  if (!dbAvailable) return t.skip('DB 연결 불가');

  const stale = await prisma.command.create({
    data: {
      projectId: project.id,
      action: 'restart',
      source: 'system',
      status: 'processing',
      startedAt: new Date(Date.now() - 700 * 1000),
      claimedByAgentId: agentA.id,
      claimedAt: new Date(Date.now() - 700 * 1000)
    }
  });

  const timedOutIds = await commandService.timeoutStaleCommands();
  assert.ok(timedOutIds.includes(stale.id));

  const after = await prisma.command.findUnique({ where: { id: stale.id } });
  assert.equal(after.status, 'timeout');
  assert.equal(after.errorMessage, 'COMMAND_TIMEOUT');
});
