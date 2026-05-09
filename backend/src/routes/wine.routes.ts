import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../lib/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { enrichWine } from '../services/wine.service.js';

const router = Router();
router.use(requireAuth);

router.get('/enrich', asyncHandler(async (req, res) => {
  const query = z.string().min(2).max(200).parse(req.query.q);
  res.json(await enrichWine(query));
}));

export default router;
