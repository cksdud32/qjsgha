import pkg from '@prisma/client';

const { PrismaClient } = pkg;

// Vercel Serverless 환경에서 함수가 재사용될 때 PrismaClient가 중복 생성되지 않도록
// 전역에 캐시해둔다. (커넥션 고갈 방지)
const globalForPrisma = globalThis;

export const prisma = globalForPrisma.__prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.__prisma = prisma;
}
