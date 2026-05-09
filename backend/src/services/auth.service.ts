import bcrypt from 'bcryptjs';
import jwt, { type SignOptions } from 'jsonwebtoken';
import crypto from 'node:crypto';
import { prisma } from '../lib/prisma.js';
import { env } from '../config/env.js';
import { ApiError, UnauthorizedError } from '../lib/errors.js';

const ACCESS_AUDIENCE = 'wine-cellar-api';

type AccessPayload = { sub: string; email: string };

function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function signAccessToken(payload: AccessPayload) {
  const options: SignOptions = {
    expiresIn: env.ACCESS_TOKEN_TTL as SignOptions['expiresIn'],
    audience: ACCESS_AUDIENCE,
  };
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, options);
}

export function verifyAccessToken(token: string) {
  return jwt.verify(token, env.JWT_ACCESS_SECRET, { audience: ACCESS_AUDIENCE }) as AccessPayload;
}

async function issueRefreshToken(userId: string) {
  const raw = crypto.randomBytes(48).toString('base64url');
  const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
  const record = await prisma.refreshToken.create({
    data: { userId, tokenHash: hashToken(raw), expiresAt },
  });
  return { raw, record };
}

function publicUser(user: { id: string; email: string; displayName: string | null }) {
  return { id: user.id, email: user.email, displayName: user.displayName };
}

export async function signup(input: { email: string; password: string; displayName?: string }) {
  const email = input.email.toLowerCase().trim();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new ApiError(409, 'Email is already registered', 'email_taken');

  const passwordHash = await bcrypt.hash(input.password, 12);
  const user = await prisma.user.create({ data: { email, passwordHash, displayName: input.displayName } });
  const cellar = await prisma.cellar.create({
    data: {
      ownerId: user.id,
      name: 'My Cellar',
      isDefault: true,
      members: { create: { userId: user.id, role: 'owner' } },
      locations: { create: { name: 'Home cellar', kind: 'home' } },
      wishlists: { create: { ownerId: user.id, name: 'Wishlist', isShared: true } },
    },
  });
  const refresh = await issueRefreshToken(user.id);
  return { user: publicUser(user), defaultCellarId: cellar.id, accessToken: signAccessToken({ sub: user.id, email }), refreshToken: refresh.raw };
}

export async function login(input: { email: string; password: string }) {
  const email = input.email.toLowerCase().trim();
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.deletedAt) throw new UnauthorizedError('Invalid email or password');

  const ok = await bcrypt.compare(input.password, user.passwordHash);
  if (!ok) throw new UnauthorizedError('Invalid email or password');

  const refresh = await issueRefreshToken(user.id);
  return { user: publicUser(user), accessToken: signAccessToken({ sub: user.id, email }), refreshToken: refresh.raw };
}

export async function refreshSession(refreshToken: string) {
  const tokenHash = hashToken(refreshToken);
  const token = await prisma.refreshToken.findUnique({ where: { tokenHash }, include: { user: true } });
  if (!token || token.revokedAt || token.expiresAt < new Date() || token.user.deletedAt) {
    throw new UnauthorizedError('Invalid refresh token');
  }

  const next = await issueRefreshToken(token.userId);
  await prisma.refreshToken.update({ where: { id: token.id }, data: { revokedAt: new Date(), replacedBy: next.record.id } });
  return {
    user: publicUser(token.user),
    accessToken: signAccessToken({ sub: token.user.id, email: token.user.email }),
    refreshToken: next.raw,
  };
}

export async function logout(refreshToken?: string) {
  if (!refreshToken) return;
  await prisma.refreshToken.updateMany({
    where: { tokenHash: hashToken(refreshToken), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
