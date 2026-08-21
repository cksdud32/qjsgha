import { prisma } from '../db.js';

export function createCommand(data) {
  return prisma.command.create({ data, include: { project: true } });
}

export function findCommands({ status, projectId } = {}) {
  return prisma.command.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(projectId ? { projectId } : {})
    },
    include: { project: true },
    orderBy: { createdAt: 'desc' }
  });
}

export function findCommandById(id) {
  return prisma.command.findUnique({ where: { id }, include: { project: true } });
}

export function findPendingCommands({ agentId } = {}) {
  return prisma.command.findMany({
    where: {
      status: 'pending',
      ...(agentId ? { project: { agentId } } : {})
    },
    include: { project: true },
    orderBy: { createdAt: 'asc' }
  });
}

// 동시에 여러 Agent(혹은 폴링 요청)가 같은 Command를 처리하지 못하도록
// "status가 아직 pending일 때만" 조건부로 processing으로 전환한다.
// 실제로 갱신된 row 수를 반환하므로, 0이면 이미 다른 곳에서 선점한 것이다.
export async function claimCommand(id) {
  const result = await prisma.command.updateMany({
    where: { id, status: 'pending' },
    data: { status: 'processing', startedAt: new Date() }
  });
  return result.count > 0;
}

// processing 상태일 때만 success/failed로 전환할 수 있다.
export async function completeCommand(id, { status, errorMessage }) {
  const result = await prisma.command.updateMany({
    where: { id, status: 'processing' },
    data: {
      status,
      finishedAt: new Date(),
      errorMessage: errorMessage ?? null
    }
  });
  return result.count > 0;
}
