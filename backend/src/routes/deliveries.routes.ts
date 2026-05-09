import { Router } from 'express';
import { z } from 'zod';
import { DeliveryStatus } from '@prisma/client';
import { asyncHandler } from '../lib/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';
import { assertCellarAccess, defaultCellarIdForUser } from '../services/access.service.js';

const router = Router();
router.use(requireAuth);

router.get('/', asyncHandler(async (req, res) => {
  const cellarId = z.string().uuid().optional().parse(req.query.cellarId) ?? await defaultCellarIdForUser(req.user!.id);
  await assertCellarAccess(req.user!.id, cellarId);
  const deliveries = await prisma.delivery.findMany({ where: { cellarId }, include: { items: { include: { wine: true } }, location: true }, orderBy: { updatedAt: 'desc' } });
  res.json({ deliveries });
}));

router.post('/', asyncHandler(async (req, res) => {
  const body = z.object({
    cellarId: z.string().uuid().optional(), locationId: z.string().uuid().optional(), merchant: z.string().optional(), orderNumber: z.string().optional(),
    trackingNumber: z.string().optional(), status: z.nativeEnum(DeliveryStatus).default('ordered'), expectedDate: z.coerce.date().optional(), notes: z.string().optional(),
  }).parse(req.body);
  const cellarId = body.cellarId ?? await defaultCellarIdForUser(req.user!.id);
  await assertCellarAccess(req.user!.id, cellarId, true);
  const delivery = await prisma.delivery.create({ data: { ...body, cellarId } });
  res.status(201).json({ delivery });
}));

export default router;
