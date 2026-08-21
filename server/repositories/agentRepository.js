import { prisma } from '../db.js';

export function findAllAgents() {
  return prisma.agent.findMany({ orderBy: { createdAt: 'asc' } });
}

export function findAgentById(id) {
  return prisma.agent.findUnique({ where: { id } });
}

export function createAgent(data) {
  return prisma.agent.create({ data });
}

export function touchAgentHeartbeat(id) {
  return prisma.agent.update({
    where: { id },
    data: { status: 'online', lastSeenAt: new Date() }
  });
}

export function updateAgentStatusReport(id, report) {
  return prisma.agent.update({
    where: { id },
    data: { ...report, status: 'online', lastSeenAt: new Date() }
  });
}
