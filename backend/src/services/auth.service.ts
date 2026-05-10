import bcrypt from 'bcryptjs';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import { env } from '../config/env.js';
import { ApiError, UnauthorizedError } from '../lib/errors.js';

const ACCESS_AUDIENCE = 'wine-cellar-api';
const REFRESH_AUDIENCE = 'wine-cellar-refresh';

type AccessPayload = { sub: string; email: string };

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

function signRefreshToken(payload: AccessPayload) {
  const options: SignOptions = {
    expiresIn: `${env.REFRESH_TOKEN_TTL_DAYS}d` as SignOptions['expiresIn'],
    audience: REFRESH_AUDIENCE,
  };
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, options);
}

function verifyRefreshToken(token: string) {
  return jwt.verify(token, env.JWT_REFRESH_SECRET, { audience: REFRESH_AUDIENCE }) as AccessPayload;
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
  return { user: publicUser(user), accessToken: signAccessToken({ sub: user.id, email }), refreshToken: signRefreshToken({ sub: user.id, email }) };
}

export async function login(input: { email: string; password: string }) {
  const email = input.email.toLowerCase().trim();
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.deletedAt) throw new UnauthorizedError('Invalid email or password');

  const ok = await bcrypt.compare(input.password, user.passwordHash);
  if (!ok) throw new UnauthorizedError('Invalid email or password');

  return { user: publicUser(user), accessToken: signAccessToken({ sub: user.id, email }), refreshToken: signRefreshToken({ sub: user.id, email }) };
}

export async function refreshSession(refreshToken: string) {
  let payload: AccessPayload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new UnauthorizedError('Invalid refresh token');
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user || user.deletedAt) throw new UnauthorizedError('Invalid refresh token');

  const tokenPayload = { sub: user.id, email: user.email };
  return {
    user: publicUser(user),
    accessToken: signAccessToken(tokenPayload),
    refreshToken: signRefreshToken(tokenPayload),
  };
}

export async function logout(_refreshToken?: string) {
  return;
}
