import { prisma } from '../db.js';
import { statusesThatCanTransitionTo } from '../types/commandTransitions.js';

const includeProject = { project: true };

export function createCommand(data) {
  return prisma.command.create({ data, include: includeProject });
}

export function findCommandByIdempotencyKey(idempotencyKey) {
  if (!idempotencyKey) return null;
  return prisma.command.findUnique({ where: { idempotencyKey }, include: includeProject });
}

export function findActiveCommandForProject(projectId) {
  return prisma.command.findFirst({
    where: { projectId, status: { in: ['pending', 'processing'] } }
  });
}

export function findCommands({ status, projectId } = {}) {
  return prisma.command.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(projectId ? { projectId } : {})
    },
    include: includeProject,
    orderBy: { createdAt: 'desc' }
  });
}

export function findCommandById(id) {
  return prisma.command.findUnique({ where: { id }, include: includeProject });
}

export function findPendingCommands({ agentId }) {
  return prisma.command.findMany({
    where: { status: 'pending', project: { agentId } },
    include: includeProject,
    orderBy: { createdAt: 'asc' }
  });
}

// commandTransitions.ALLOWED_TRANSITIONS에 정의된 규칙만 따르는 공용 조건부 전이.
// "id가 fromStatuses 중 하나일 때만" toStatus로 바꾸고, 실제로 바뀐 row 수를 반환한다.
// 0이면 이미 다른 요청이 먼저 상태를 바꿨거나(경합), 애초에 허용되지 않는 전이였다는 뜻이다.
async function transitionCommand(id, toStatus, data = {}) {
  const fromStatuses = statusesThatCanTransitionTo(toStatus);
  if (fromStatuses.length === 0) {
    throw new Error(`toStatus로 전이 가능한 fromStatus가 없습니다: ${toStatus}`);
  }
  const result = await prisma.command.updateMany({
    where: { id, status: { in: fromStatuses } },
    data: { status: toStatus, ...data }
  });
  return result.count > 0;
}

// pending -> processing. 두 Agent가 동시에 같은 Command를 claim해도 한 쪽만 성공한다.
export function claimCommand(id, agentId) {
  return transitionCommand(id, 'processing', {
    startedAt: new Date(),
    claimedByAgentId: agentId,
    claimedAt: new Date()
  });
}

// processing -> success/failed/timeout.
export function completeCommand(id, { status, errorMessage = null }) {
  return transitionCommand(id, status, {
    finishedAt: new Date(),
    errorMessage
  });
}

// pending -> cancelled. processing 이상으로 넘어간 명령은 취소할 수 없다.
export function cancelCommand(id) {
  return transitionCommand(id, 'cancelled', { finishedAt: new Date() });
}

// 오래 processing 상태에 머문 명령들을 timeout 후보로 조회한다(정리는 상위 서비스에서 개별 처리).
export function findStaleProcessingCommands(olderThan) {
  return prisma.command.findMany({
    where: { status: 'processing', startedAt: { lt: olderThan } },
    include: includeProject
  });
}
