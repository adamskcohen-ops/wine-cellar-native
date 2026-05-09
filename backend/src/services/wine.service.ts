import crypto from 'node:crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { env } from '../config/env.js';

export type WineInput = {
  producer?: string;
  name: string;
  vintage?: number;
  type?: string;
  varietal?: string;
  country?: string;
  region?: string;
  subRegion?: string;
  appellation?: string;
  designation?: string;
  criticScore?: number;
  marketValueMin?: number;
  marketValueAvg?: number;
  marketValueMax?: number;
  drinkStart?: number;
  drinkEnd?: number;
  tastingNotes?: string;
  foodPairings?: string[];
  rawSource?: Prisma.InputJsonValue;
  source?: string;
};

export function normalizedWineKey(wine: Pick<WineInput, 'producer' | 'name' | 'vintage' | 'region'>) {
  return [wine.producer, wine.name, wine.vintage, wine.region]
    .filter(Boolean)
    .join('|')
    .toLowerCase()
    .replace(/[^a-z0-9|]+/g, ' ')
    .trim();
}

export async function upsertWine(input: WineInput) {
  const normalizedKey = normalizedWineKey(input);
  return prisma.wine.upsert({
    where: { normalizedKey },
    create: { ...input, normalizedKey },
    update: { ...input },
  });
}

function queryHash(query: string) {
  return crypto.createHash('sha256').update(query.toLowerCase().trim()).digest('hex');
}

export async function enrichWine(query: string) {
  const hash = queryHash(query);
  const cached = await prisma.wineLookupCache.findUnique({ where: { queryHash: hash }, include: { wine: true } });
  if (cached && cached.expiresAt > new Date()) return { cached: true, response: cached.response, wine: cached.wine };

  let response: Prisma.InputJsonValue;
  if (!env.WINE_SEARCHER_API_KEY) {
    response = { provider: 'fallback', query, message: 'Wine-Searcher key not configured. Cache entry created for local dev.' };
  } else {
    const url = new URL('/lookup', env.WINE_SEARCHER_BASE_URL);
    url.searchParams.set('q', query);
    const apiResponse = await fetch(url, { headers: { Authorization: `Bearer ${env.WINE_SEARCHER_API_KEY}` } });
    if (!apiResponse.ok) throw new Error(`Wine-Searcher lookup failed with ${apiResponse.status}`);
    response = (await apiResponse.json()) as Prisma.InputJsonValue;
  }

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const cache = await prisma.wineLookupCache.upsert({
    where: { queryHash: hash },
    create: { queryHash: hash, query, response, expiresAt },
    update: { response, expiresAt },
  });
  return { cached: false, response: cache.response, wine: null };
}
