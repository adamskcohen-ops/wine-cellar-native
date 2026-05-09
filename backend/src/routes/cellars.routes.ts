import { Router } from 'express';
import { z } from 'zod';
import crypto from 'node:crypto';
import { asyncHandler } from '../lib/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';
import { assertCellarAccess } from '../services/access.service.js';

const router = Router();
router.use(requireAuth);

router.get('/', asyncHandler(async (req, res) => {
  const memberships = await prisma.cellarMember.findMany({
    where: { userId: req.user!.id, cellar: { deletedAt: null } },
    include: { cellar: { include: { locations: true, members: { include: { user: { select: { id: true, email: true, displayName: true } } } } } } },
  });
  res.json({ cellars: memberships.map((m) => ({ ...m.cellar, role: m.role })) });
}));

router.post('/', asyncHandler(async (req, res) => {
  const body = z.object({ name: z.string().min(1), description: z.string().optional() }).parse(req.body);
  const cellar = await prisma.cellar.create({
    data: { ownerId: req.user!.id, name: body.name, description: body.description, members: { create: { userId: req.user!.id, role: 'owner' } } },
  });
  res.status(201).json({ cellar });
}));

router.post('/:id/locations', asyncHandler(async (req, res) => {
  const cellarId = z.string().uuid().parse(req.params.id);
  await assertCellarAccess(req.user!.id, cellarId, true);
  const body = z.object({ name: z.string().min(1), kind: z.string().optional(), address: z.string().optional(), notes: z.string().optional() }).parse(req.body);
  const location = await prisma.storageLocation.create({ data: { ...body, cellarId } });
  res.status(201).json({ location });
}));

router.post('/:id/invites', asyncHandler(async (req, res) => {
  const cellarId = z.string().uuid().parse(req.params.id);
  const member = await assertCellarAccess(req.user!.id, cellarId, true);
  if (!['owner', 'admin'].includes(member.role)) throw new Error('Only owners and admins can invite');
  const body = z.object({ email: z.string().email(), role: z.enum(['admin', 'editor', 'viewer']).default('viewer') }).parse(req.body);
  const rawToken = crypto.randomBytes(32).toString('base64url');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const invite = await prisma.cellarInvite.create({
    data: { cellarId, email: body.email.toLowerCase(), role: body.role, tokenHash, invitedByUserId: req.user!.id, expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) },
  });
  res.status(201).json({ invite: { ...invite, tokenHash: undefined }, inviteToken: rawToken });
}));

export default router;
