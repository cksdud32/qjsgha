import { prisma } from '../db.js';

export function findAllProjects() {
  return prisma.project.findMany({ orderBy: { createdAt: 'asc' } });
}

export function findProjectById(id) {
  return prisma.project.findUnique({ where: { id } });
}

export function createProject(data) {
  return prisma.project.create({ data });
}

export function updateProjectStatus(id, status) {
  return prisma.project.update({
    where: { id },
    data: { status, lastSeenAt: new Date() }
  });
}
