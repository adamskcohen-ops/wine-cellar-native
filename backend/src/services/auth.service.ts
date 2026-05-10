import bcrypt from 'bcryptjs';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import { env } from '../config/env.js';
import { ApiError, UnauthorizedError } from '../lib/errors.js';

const ACCESS_AUDIENCE = 'wine-cellar-api';
const REFRESH_AUDIENCE = 'wine-cellar-refresh';

type AccessPayload = { sub: string; email: string };
type JwtExpiresIn = NonNullable<SignOptions['expiresIn']>;

function normalizeJwtExpiresIn(value: string | number | undefined, fallback: JwtExpiresIn): JwtExpiresIn {
  if (typeof value === 'number') return value;
  const raw = value?.trim();
  if (!raw) return fallback;
  const unquoted = raw.replace(/^['\"]|['\"]$/g, '').trim();
  if (/^\d+$/.test(unquoted)) return Number(unquoted);
  if (/^\d+(\.\d+)?\s*(ms|millisecond|milliseconds|s|sec|secs|second|seconds|m|min|mins|minute|minutes|h|hr|hrs|hour|hours|d|day|days|w|week|weeks|y|yr|yrs|year|years)$/i.test(unquoted)) {
    return unquoted as JwtExpiresIn;
  }
  console.warn('[auth:config] Invalid ACCESS_TOKEN_TTL, falling back to default', { value });
  return fallback;
}

const ACCESS_TOKEN_EXPIRES_IN = normalizeJwtExpiresIn(env.ACCESS_TOKEN_TTL, '15m');
const REFRESH_TOKEN_EXPIRES_IN = normalizeJwtExpiresIn(`${env.REFRESH_TOKEN_TTL_DAYS}d`, '30d');

function logAuthFailure(stage: string, err: unknown, email?: string) {
  console.error('[auth:error]', {
    stage,
    email,
    name: err instanceof Error ? err.name : undefined,
    message: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined,
    code: typeof (err as { code?: unknown })?.code === 'string' ? (err as { code: string }).code : undefined,
    meta: (err as { meta?: unknown })?.meta,
  });
}

export function signAccessToken(payload: AccessPayload) {
  const options: SignOptions = {
    expiresIn: ACCESS_TOKEN_EXPIRES_IN,
    audience: ACCESS_AUDIENCE,
  };
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, options);
}

export function verifyAccessToken(token: string) {
  return jwt.verify(token, env.JWT_ACCESS_SECRET, { audience: ACCESS_AUDIENCE }) as AccessPayload;
}

function signRefreshToken(payload: AccessPayload) {
  const options: SignOptions = {
    expiresIn: REFRESH_TOKEN_EXPIRES_IN,
    audience: REFRESH_AUDIENCE,
  };
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, options);
}

function verifyRefreshToken(token: string) {
  return jwt.verify(token, env.JWT_REFRESH_SECRET, { audience: REFRESH_AUDIENCE }) as AccessPayload;
}

function issueTokens(payload: AccessPayload) {
  try {
    return {
      accessToken: signAccessToken(payload),
      refreshToken: signRefreshToken(payload),
    };
  } catch (err) {
    logAuthFailure('issue_tokens', err, payload.email);
    throw err;
  }
}

function publicUser(user: { id: string; email: string; displayName: string | null }) {
  return { id: user.id, email: user.email, displayName: user.displayName };
}

export async function signup(input: { email: string; password: string; displayName?: string }) {
  const email = input.email.toLowerCase().trim();
  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new ApiError(409, 'Email is already registered', 'email_taken');

    const passwordHash = await bcrypt.hash(input.password, 12);
    const user = await prisma.user.create({ data: { email, passwordHash, displayName: input.displayName } });
    const tokens = issueTokens({ sub: user.id, email });
    return { user: publicUser(user), ...tokens };
  } catch (err) {
    if (err instanceof ApiError) throw err;
    logAuthFailure('signup', err, email);
    throw err;
  }
}

export async function login(input: { email: string; password: string }) {
  const email = input.email.toLowerCase().trim();
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.deletedAt) throw new UnauthorizedError('Invalid email or password');

    const ok = await bcrypt.compare(input.password, user.passwordHash);
    if (!ok) throw new UnauthorizedError('Invalid email or password');

    const tokens = issueTokens({ sub: user.id, email });
    return { user: publicUser(user), ...tokens };
  } catch (err) {
    if (err instanceof ApiError) throw err;
    logAuthFailure('login', err, email);
    throw err;
  }
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
    ...issueTokens(tokenPayload),
  };
}

export async function logout(_refreshToken?: string) {
  return;
}
