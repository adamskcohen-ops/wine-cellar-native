import { prisma } from '../lib/prisma.js';
import { NotFoundError, UnauthorizedError } from '../lib/errors.js';

export async function assertCellarAccess(userId: string, cellarId: string, write = false) {
  const member = await prisma.cellarMember.findUnique({ where: { cellarId_userId: { cellarId, userId } } });
  if (!member) throw new NotFoundError('Cellar not found');
  if (write && member.role === 'viewer') throw new UnauthorizedError('Viewer access is read-only');
  return member;
}

export async function defaultCellarIdForUser(userId: string) {
  const member = await prisma.cellarMember.findFirst({
    where: { userId, cellar: { deletedAt: null } },
    orderBy: [{ cellar: { isDefault: 'desc' } }, { createdAt: 'asc' }],
    select: { cellarId: true },
  });
  if (!member) throw new NotFoundError('No cellar found');
  return member.cellarId;
}
