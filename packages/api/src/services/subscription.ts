import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { users, subscriptions } from '../db/schema.js';

export type SubscriptionTier = 'trial' | 'active' | 'free';

export interface SubscriptionInfo {
  status: SubscriptionTier;
  trialEndsAt: string | null;
  isPremium: boolean;
}

/**
 * Resolve effective subscription status.
 * If user is on trial and trialEndsAt is past → auto-downgrade to free.
 */
export async function getSubscriptionInfo(userId: number): Promise<SubscriptionInfo> {
  const [user] = await db
    .select({
      subscriptionStatus: users.subscriptionStatus,
      trialEndsAt: users.trialEndsAt,
    })
    .from(users)
    .where(eq(users.id, userId));

  if (!user) {
    return { status: 'free', trialEndsAt: null, isPremium: false };
  }

  let status = user.subscriptionStatus as SubscriptionTier;

  // Auto-downgrade expired trial
  if (status === 'trial' && user.trialEndsAt && new Date() > user.trialEndsAt) {
    status = 'free';
    await db
      .update(users)
      .set({ subscriptionStatus: 'free', updatedAt: new Date() })
      .where(eq(users.id, userId));
  }

  return {
    status,
    trialEndsAt: user.trialEndsAt?.toISOString() ?? null,
    isPremium: status === 'trial' || status === 'active',
  };
}

/**
 * Activate subscription after payment.
 */
export async function activateSubscription(
  userId: number,
  provider: string,
  paymentId: string,
  durationDays: number,
): Promise<void> {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + durationDays);

  // Record in subscriptions table
  await db.insert(subscriptions).values({
    userId,
    status: 'active',
    expiresAt,
    paymentProvider: provider,
    paymentId,
  });

  // Update user status
  await db
    .update(users)
    .set({
      subscriptionStatus: 'active',
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));
}

/**
 * Extend trial by given days (for referral bonus).
 */
export async function extendTrial(userId: number, days: number): Promise<void> {
  const [user] = await db
    .select({ trialEndsAt: users.trialEndsAt, subscriptionStatus: users.subscriptionStatus })
    .from(users)
    .where(eq(users.id, userId));

  if (!user) return;

  // Only extend if still on trial or newly downgraded to free
  if (user.subscriptionStatus === 'trial' || user.subscriptionStatus === 'free') {
    const base = user.trialEndsAt && new Date(user.trialEndsAt) > new Date()
      ? new Date(user.trialEndsAt)
      : new Date();
    base.setDate(base.getDate() + days);

    await db
      .update(users)
      .set({
        subscriptionStatus: 'trial',
        trialEndsAt: base,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }
}
