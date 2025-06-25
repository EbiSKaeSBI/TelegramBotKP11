import { prisma } from '../prisma';

export async function getUser(telegramId: number | bigint) {
  return prisma.user.findUnique({ where: { telegramId: BigInt(telegramId) } });
}

export async function upsertUser(telegramId: number | bigint, name?: string, email?: string) {
  return prisma.user.upsert({
    where: { telegramId: BigInt(telegramId) },
    update: { name, email },
    create: { telegramId: BigInt(telegramId), name, email }
  });
}

export async function getAllUsers() {
  return prisma.user.findMany({ orderBy: { telegramId: 'asc' } });
} 