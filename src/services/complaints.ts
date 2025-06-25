import { prisma } from '../prisma';
import { ComplaintStatus } from '@prisma/client';

export async function getUserComplaints(telegramId: number | bigint) {
  return prisma.complaint.findMany({
    where: { telegramId: BigInt(telegramId) },
    orderBy: { createdAt: 'desc' }
  });
}

export async function getAllComplaintUsers() {
  // Получить всех пользователей, у которых есть жалобы
  return prisma.complaint.findMany({
    distinct: ['telegramId'],
    select: { telegramId: true }
  });
}

export async function getAllComplaintUsersWithActive() {
  // Получить только пользователей с активными жалобами (NEW или REVIEWED)
  const active = await prisma.complaint.findMany({
    where: {
      OR: [
        { status: ComplaintStatus.NEW },
        { status: ComplaintStatus.REVIEWED }
      ]
    },
    distinct: ['telegramId'],
    select: { telegramId: true }
  });
  return active;
}

export async function addComplaint(telegramId: number | bigint, text: string) {
  return prisma.complaint.create({
    data: {
      telegramId: BigInt(telegramId),
      text,
      status: ComplaintStatus.NEW
    }
  });
}

export async function setComplaintStatus(id: number, status: ComplaintStatus) {
  return prisma.complaint.update({
    where: { id },
    data: { status, reviewedAt: status === ComplaintStatus.REVIEWED ? new Date() : undefined, closedAt: status === ComplaintStatus.CLOSED ? new Date() : undefined }
  });
}

export async function getComplaintById(id: number) {
  return prisma.complaint.findUnique({ where: { id } });
}

export async function getActiveComplaints(telegramId: number | bigint) {
  return prisma.complaint.findMany({
    where: {
      telegramId: BigInt(telegramId),
      OR: [
        { status: ComplaintStatus.NEW },
        { status: ComplaintStatus.REVIEWED }
      ]
    },
    orderBy: { createdAt: 'desc' }
  });
}

export async function getAllComplaints() {
  return prisma.complaint.findMany({
    orderBy: { createdAt: 'desc' }
  });
} 