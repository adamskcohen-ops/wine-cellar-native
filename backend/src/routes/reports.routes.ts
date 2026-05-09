import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../lib/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';
import { assertCellarAccess, defaultCellarIdForUser } from '../services/access.service.js';

const router = Router();
router.use(requireAuth);

router.get('/insurance-export', asyncHandler(async (req, res) => {
  const cellarId = z.string().uuid().optional().parse(req.query.cellarId) ?? await defaultCellarIdForUser(req.user!.id);
  await assertCellarAccess(req.user!.id, cellarId);
  const bottles = await prisma.cellarBottle.findMany({ where: { cellarId, deletedAt: null, status: 'cellar' }, include: { wine: true, location: true }, orderBy: { updatedAt: 'desc' } });
  const totalValue = bottles.reduce((sum, bottle) => sum + Number(bottle.marketValue ?? bottle.pricePaid ?? 0) * bottle.quantity, 0);
  res.json({ generatedAt: new Date().toISOString(), cellarId, totalBottles: bottles.reduce((sum, b) => sum + b.quantity, 0), totalValue, bottles });
}));

export default router;
