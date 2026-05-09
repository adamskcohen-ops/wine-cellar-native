import { prisma } from '../lib/prisma.js';
import { UnauthorizedError } from '../lib/errors.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { verifyAccessToken } from '../services/auth.service.js';

export const requireAuth = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
  if (!token) throw new UnauthorizedError();

  const payload = verifyAccessToken(token);
  const user = await prisma.user.findUnique({ where: { id: payload.sub }, select: { id: true, email: true, displayName: true, deletedAt: true } });
  if (!user || user.deletedAt) throw new UnauthorizedError();

  req.user = { id: user.id, email: user.email, displayName: user.displayName };
  next();
});
