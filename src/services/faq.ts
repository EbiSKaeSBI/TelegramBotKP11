import { prisma } from '../prisma';

export async function getAllFaqs() {
  return prisma.fAQ.findMany({ orderBy: { id: 'asc' } });
}

export async function addFaq(question: string, answer: string) {
  return prisma.fAQ.create({ data: { question, answer } });
}

export async function deleteFaq(id: number) {
  return prisma.fAQ.delete({ where: { id } });
} 