import type { ErrorRequestHandler } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { ApiError } from '../lib/errors.js';

type SerializedError = {
  name?: string;
  message: string;
  stack?: string;
  code?: string;
  cause?: unknown;
};

function serializeError(err: unknown): SerializedError {
  if (err instanceof Error) {
    const errorWithExtras = err as Error & { code?: unknown; cause?: unknown };
    return {
      name: err.name,
      message: err.message,
      stack: err.stack,
      ...(typeof errorWithExtras.code === 'string' ? { code: errorWithExtras.code } : {}),
      ...(typeof errorWithExtras.cause !== 'undefined' ? { cause: errorWithExtras.cause } : {}),
    };
  }
  return { message: String(err) };
}

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof ZodError) {
    res.status(400).json({ error: { code: 'validation_error', message: 'Invalid request', issues: err.issues } });
    return;
  }
  if (err instanceof ApiError) {
    res.status(err.statusCode).json({ error: { code: err.code, message: err.message } });
    return;
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    console.error('[request:error:prisma-known]', {
      method: req.method,
      path: req.path,
      prismaCode: err.code,
      message: err.message,
      meta: err.meta,
    });
    res.status(400).json({ error: { code: 'database_error', message: err.message, prismaCode: err.code, meta: err.meta } });
    return;
  }
  if (err instanceof Prisma.PrismaClientUnknownRequestError || err instanceof Prisma.PrismaClientValidationError) {
    console.error('[request:error:prisma]', {
      method: req.method,
      path: req.path,
      ...serializeError(err),
    });
    res.status(500).json({ error: { code: 'database_error', message: err.message } });
    return;
  }

  const serialized = serializeError(err);
  console.error('[request:error:unhandled]', { method: req.method, path: req.path, ...serialized });
  res.status(500).json({
    error: {
      code: 'internal_error',
      message: serialized.message || 'Something went wrong',
      name: serialized.name,
    },
  });
};
