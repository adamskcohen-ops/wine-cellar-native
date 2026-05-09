import type { SubscriptionTier } from '@prisma/client';

export const tierLimits: Record<SubscriptionTier, { bottleLimit: number; cloudSync: boolean; valuationRefreshDays: number | null; multiLocation: boolean }> = {
  free: { bottleLimit: 50, cloudSync: false, valuationRefreshDays: null, multiLocation: false },
  premium: { bottleLimit: 500, cloudSync: true, valuationRefreshDays: 30, multiLocation: false },
  collector: { bottleLimit: 5000, cloudSync: true, valuationRefreshDays: 7, multiLocation: true },
};
