import { prisma } from '../db.js';

export function addCommandLog(commandId, level, message) {
  return prisma.commandLog.create({ data: { commandId, level, message } });
}
