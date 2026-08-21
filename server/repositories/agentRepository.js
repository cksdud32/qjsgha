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
