import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../lib/asyncHandler.js';
import { login, logout, refreshSession, signup } from '../services/auth.service.js';

const router = Router();
const email = z.string().email().max(255);
const password = z.string().min(8).max(128);

router.post('/signup', asyncHandler(async (req, res) => {
  const body = z.object({ email, password, displayName: z.string().min(1).max(120).optional() }).parse(req.body);
  res.status(201).json(await signup(body));
}));

router.post('/login', asyncHandler(async (req, res) => {
  const body = z.object({ email, password }).parse(req.body);
  res.json(await login(body));
}));

router.post('/refresh', asyncHandler(async (req, res) => {
  const body = z.object({ refreshToken: z.string().min(20) }).parse(req.body);
  res.json(await refreshSession(body.refreshToken));
}));

router.post('/logout', asyncHandler(async (req, res) => {
  const body = z.object({ refreshToken: z.string().min(20).optional() }).parse(req.body ?? {});
  await logout(body.refreshToken);
  res.status(204).send();
}));

export default router;
