import { prisma } from '../prisma';
import { ProfessionStoryStatus } from '@prisma/client';

export async function getUserStories(telegramId: number | bigint) {
  return prisma.professionStory.findMany({
    where: { telegramId: BigInt(telegramId) },
    orderBy: { createdAt: 'desc' }
  });
}

export async function addStory(telegramId: number | bigint, text: string) {
  return prisma.professionStory.create({
    data: {
      telegramId: BigInt(telegramId),
      text,
      status: ProfessionStoryStatus.NEW
    }
  });
}

export async function setStoryStatus(id: number, status: ProfessionStoryStatus) {
  return prisma.professionStory.update({
    where: { id },
    data: { status, reviewedAt: status === ProfessionStoryStatus.REVIEWED ? new Date() : undefined, closedAt: status === ProfessionStoryStatus.CLOSED ? new Date() : undefined }
  });
}

export async function getStoryById(id: number) {
  return prisma.professionStory.findUnique({ where: { id } });
}

export async function getAllStories() {
  return prisma.professionStory.findMany({ orderBy: { createdAt: 'desc' } });
} 