import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../lib/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';

const router = Router();
router.use(requireAuth);

router.post('/device-tokens', asyncHandler(async (req, res) => {
  const body = z.object({ token: z.string().min(10), platform: z.enum(['ios', 'android', 'web']) }).parse(req.body);
  const deviceToken = await prisma.deviceToken.upsert({
    where: { token: body.token },
    create: { userId: req.user!.id, ...body },
    update: { userId: req.user!.id, platform: body.platform, revokedAt: null },
  });
  res.status(201).json({ deviceToken });
}));

router.get('/', asyncHandler(async (req, res) => {
  const notifications = await prisma.notification.findMany({ where: { userId: req.user!.id }, orderBy: { createdAt: 'desc' }, take: 100 });
  res.json({ notifications });
}));

export default router;
