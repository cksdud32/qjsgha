// 통합 테스트: Agent heartbeat / status 보고 / offline 판정.
// commandService.integration.test.js 와 동일한 규칙(실제 DATABASE_URL, DB 없으면 skip, test- 접두사 정리).

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

let prisma, agentService;
let dbAvailable = true;
const runId = Date.now();
let agent;

before(async () => {
  try {
    ({ prisma } = await import('../server/db.js'));
    agentService = await import('../server/services/agentService.js');
    await prisma.$queryRaw`SELECT 1`;
    agent = await agentService.createAgent({ name: `test-agent-hb-${runId}` });
  } catch (error) {
    console.warn('[agentService.integration.test] DB 연결 불가, 건너뜁니다:', error.message);
    dbAvailable = false;
  }
});

after(async () => {
  if (!dbAvailable) return;
  if (agent) await prisma.agent.delete({ where: { id: agent.id } }).catch(() => {});
  await prisma.$disconnect();
});

test('recordHeartbeat: lastSeenAt 갱신 + status online', async (t) => {
  if (!dbAvailable) return t.skip('DB 연결 불가');

  const before = await prisma.agent.findUnique({ where: { id: agent.id } });
  await new Promise((r) => setTimeout(r, 5));
  const updated = await agentService.recordHeartbeat(agent.id);

  assert.equal(updated.status, 'online');
  assert.ok(updated.lastSeenAt, 'lastSeenAt 존재');
  assert.ok(
    !before.lastSeenAt || new Date(updated.lastSeenAt) >= new Date(before.lastSeenAt),
    'lastSeenAt 이 앞으로 감'
  );
});

test('recordHeartbeat: 없는 Agent 는 404', async (t) => {
  if (!dbAvailable) return t.skip('DB 연결 불가');
  await assert.rejects(
    () => agentService.recordHeartbeat(`nope-${runId}`),
    (err) => err.status === 404 && err.code === 'AGENT_NOT_FOUND'
  );
});

test('reportAgentStatus: hostname/platform/uptime/cpu/memory 저장', async (t) => {
  if (!dbAvailable) return t.skip('DB 연결 불가');

  const saved = await agentService.reportAgentStatus(agent.id, {
    hostname: 'test-host',
    platform: 'linux',
    uptime: 123.9,
    cpuUsage: 12.5,
    memoryUsage: 40,
  });

  assert.equal(saved.hostname, 'test-host');
  assert.equal(saved.platform, 'linux');
  assert.equal(saved.uptime, 123); // Math.floor
  assert.equal(saved.cpuUsage, 12.5);
  assert.equal(saved.memoryUsage, 40);
  assert.equal(saved.status, 'online');
});

test('reportAgentStatus: 범위를 벗어난 cpuUsage 는 400', async (t) => {
  if (!dbAvailable) return t.skip('DB 연결 불가');
  await assert.rejects(
    () => agentService.reportAgentStatus(agent.id, { cpuUsage: 150 }),
    (err) => err.status === 400 && err.code === 'VALIDATION_ERROR'
  );
});

test('deriveAgentStatus: lastSeenAt 이 오래되면 offline 으로 계산된다', async (t) => {
  if (!dbAvailable) return t.skip('DB 연결 불가');

  await prisma.agent.update({
    where: { id: agent.id },
    data: { status: 'online', lastSeenAt: new Date(Date.now() - 3600 * 1000) },
  });
  const stale = await prisma.agent.findUnique({ where: { id: agent.id } });
  assert.equal(agentService.deriveAgentStatus(stale), 'offline');

  const list = await agentService.listAgents();
  const mine = list.find((a) => a.id === agent.id);
  assert.equal(mine.status, 'offline', 'listAgents 도 계산된 status 를 돌려준다');
});
