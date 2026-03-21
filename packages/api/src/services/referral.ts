import { eq, and } from 'drizzle-orm';
import { db } from '../db/index.js';
import { users, referrals } from '../db/schema.js';
import { extendTrial } from './subscription.js';

const REFERRAL_BONUS_DAYS = 3;

/**
 * Process referral: link referrer and referred user, give +3 days trial to both.
 * Called when a new user registers via deep link with ref_<referrerId>.
 * Returns true if bonus was applied, false if already linked or invalid.
 */
export async function processReferral(referrerTelegramId: string, referredUserId: number): Promise<boolean> {
  // Find referrer by telegramId
  const [referrer] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.telegramId, BigInt(referrerTelegramId)));

  if (!referrer || referrer.id === referredUserId) {
    return false;
  }

  // Check if already linked
  const [existing] = await db
    .select({ id: referrals.id })
    .from(referrals)
    .where(eq(referrals.referredId, referredUserId));

  if (existing) {
    return false;
  }

  // Create referral record
  await db.insert(referrals).values({
    referrerId: referrer.id,
    referredId: referredUserId,
    bonusApplied: true,
  });

  // Grant bonus to both
  await extendTrial(referrer.id, REFERRAL_BONUS_DAYS);
  await extendTrial(referredUserId, REFERRAL_BONUS_DAYS);

  return true;
}
