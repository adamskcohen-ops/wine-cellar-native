import { Router } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { asyncHandler } from '../lib/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';

const router = Router();
router.use(requireAuth);

router.get('/snapshot', asyncHandler(async (req, res) => {
  const [bottles, wines] = await Promise.all([
    prisma.cellarBottle.findMany({ where: { userId: req.user!.id }, include: { wine: true } }),
    prisma.wine.findMany({ where: { bottles: { some: { userId: req.user!.id } } } }),
  ]);
  res.json({ serverTime: new Date().toISOString(), bottles, wines });
}));

router.get('/changes', asyncHandler(async (req, res) => {
  const since = z.coerce.date().optional().parse(req.query.since);
  const changes = await prisma.syncEvent.findMany({
    where: { userId: req.user!.id, ...(since ? { createdAt: { gt: since } } : {}) },
    orderBy: { createdAt: 'asc' },
  });
  res.json({ serverTime: new Date().toISOString(), changes });
}));

router.post('/push', asyncHandler(async (req, res) => {
  const body = z.object({
    changes: z.array(z.object({
      clientId: z.string().min(1), operation: z.enum(['upsert', 'delete']), entityType: z.literal('cellar_bottle'), payload: z.record(z.string(), z.unknown()).optional(), updatedAt: z.coerce.date().optional(),
    })).max(500),
  }).parse(req.body);

  const results = [];
  for (const change of body.changes) {
    if (change.operation === 'delete') {
      const updated = await prisma.cellarBottle.updateMany({ where: { userId: req.user!.id, clientId: change.clientId }, data: { deletedAt: new Date() } });
      results.push({ clientId: change.clientId, operation: 'delete', count: updated.count });
      continue;
    }

    const payload = change.payload ?? {};
    const bottle = await prisma.cellarBottle.upsert({
      where: { userId_clientId: { userId: req.user!.id, clientId: change.clientId } },
      create: { userId: req.user!.id, clientId: change.clientId, localPayload: payload as Prisma.InputJsonValue },
      update: { localPayload: payload as Prisma.InputJsonValue, deletedAt: null },
    });
    await prisma.syncEvent.create({ data: { userId: req.user!.id, entityType: 'cellar_bottle', entityId: bottle.id, operation: 'upsert', payload: bottle as Prisma.InputJsonValue } });
    results.push({ clientId: change.clientId, id: bottle.id, operation: 'upsert' });
  }
  res.json({ serverTime: new Date().toISOString(), results });
}));

export default router;
