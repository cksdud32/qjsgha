import { prisma } from '../db.js';

export function addCommandLog({ commandId, projectId = null, agentId = null, level = 'info', message }) {
  return prisma.commandLog.create({
    data: { commandId, projectId, agentId, level, message }
  });
}
