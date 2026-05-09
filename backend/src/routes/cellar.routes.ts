import { Router } from 'express';
import { z } from 'zod';
import { Prisma, WineStatus } from '@prisma/client';
import { asyncHandler } from '../lib/asyncHandler.js';
import { prisma } from '../lib/prisma.js';
import { NotFoundError } from '../lib/errors.js';
import { requireAuth } from '../middleware/auth.js';
import { upsertWine } from '../services/wine.service.js';
import { assertCellarAccess, defaultCellarIdForUser } from '../services/access.service.js';

const router = Router();
router.use(requireAuth);

const wineSchema = z.object({
  producer: z.string().optional(), name: z.string().min(1), vintage: z.number().int().min(1800).max(2200).optional(),
  type: z.string().optional(), varietal: z.string().optional(), country: z.string().optional(), region: z.string().optional(),
  subRegion: z.string().optional(), appellation: z.string().optional(), designation: z.string().optional(), criticScore: z.number().optional(),
  marketValueMin: z.number().optional(), marketValueAvg: z.number().optional(), marketValueMax: z.number().optional(), drinkStart: z.number().int().optional(),
  drinkEnd: z.number().int().optional(), tastingNotes: z.string().optional(), foodPairings: z.array(z.string()).optional(), rawSource: z.unknown().optional(), source: z.string().optional(),
});

const bottleSchema = z.object({
  clientId: z.string().optional(),
  status: z.nativeEnum(WineStatus).default('cellar'),
  quantity: z.number().int().positive().default(1),
  bottleSize: z.string().default('750ml'),
  pricePaid: z.number().optional(), marketValue: z.number().optional(),
  purchaseDate: z.coerce.date().optional(), purchaseSource: z.string().optional(),
  storageLocation: z.string().optional(), rack: z.string().optional(), bin: z.string().optional(),
  personalRating: z.number().int().min(1).max(5).optional(), personalNotes: z.string().optional(), dateConsumed: z.coerce.date().optional(),
  imageUri: z.string().optional(), localPayload: z.unknown().optional(), wine: wineSchema.optional(), wineId: z.string().uuid().optional(),
  cellarId: z.string().uuid().optional(), locationId: z.string().uuid().optional(),
});

function bottleSelect() {
  return { wine: true };
}

router.get('/', asyncHandler(async (req, res) => {
  const query = z.object({ status: z.nativeEnum(WineStatus).optional(), cellarId: z.string().uuid().optional() }).parse(req.query);
  const cellarId = query.cellarId ?? await defaultCellarIdForUser(req.user!.id);
  await assertCellarAccess(req.user!.id, cellarId);
  const bottles = await prisma.cellarBottle.findMany({
    where: { cellarId, deletedAt: null, ...(query.status ? { status: query.status } : {}) },
    include: bottleSelect(), orderBy: { updatedAt: 'desc' },
  });
  res.json({ bottles });
}));

router.post('/', asyncHandler(async (req, res) => {
  const body = bottleSchema.parse(req.body);
  const cellarId = body.cellarId ?? await defaultCellarIdForUser(req.user!.id);
  await assertCellarAccess(req.user!.id, cellarId, true);
  const wine = body.wine ? await upsertWine(body.wine as any) : null;
  const bottle = await prisma.cellarBottle.create({
    data: { ...body, wine: undefined, localPayload: body.localPayload as Prisma.InputJsonValue, userId: req.user!.id, cellarId, wineId: body.wineId ?? wine?.id },
    include: bottleSelect(),
  });
  await prisma.syncEvent.create({ data: { userId: req.user!.id, entityType: 'cellar_bottle', entityId: bottle.id, operation: 'upsert', payload: bottle as Prisma.InputJsonValue } });
  res.status(201).json({ bottle });
}));

router.patch('/:id', asyncHandler(async (req, res) => {
  const id = z.string().uuid().parse(req.params.id);
  const existing = await prisma.cellarBottle.findFirst({ where: { id, deletedAt: null } });
  if (!existing || !existing.cellarId) throw new NotFoundError('Bottle not found');
  await assertCellarAccess(req.user!.id, existing.cellarId, true);
  const body = bottleSchema.partial().parse(req.body);
  const wine = body.wine ? await upsertWine(body.wine as any) : null;
  const bottle = await prisma.cellarBottle.update({
    where: { id }, data: { ...body, wine: undefined, localPayload: body.localPayload as Prisma.InputJsonValue, wineId: body.wineId ?? wine?.id ?? existing.wineId }, include: bottleSelect(),
  });
  await prisma.syncEvent.create({ data: { userId: req.user!.id, entityType: 'cellar_bottle', entityId: bottle.id, operation: 'upsert', payload: bottle as Prisma.InputJsonValue } });
  res.json({ bottle });
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const id = z.string().uuid().parse(req.params.id);
  const bottle = await prisma.cellarBottle.findFirst({ where: { id, deletedAt: null } });
  if (!bottle || !bottle.cellarId) throw new NotFoundError('Bottle not found');
  await assertCellarAccess(req.user!.id, bottle.cellarId, true);
  await prisma.cellarBottle.update({ where: { id }, data: { deletedAt: new Date() } });
  await prisma.syncEvent.create({ data: { userId: req.user!.id, entityType: 'cellar_bottle', entityId: id, operation: 'delete' } });
  res.status(204).send();
}));

export default router;
