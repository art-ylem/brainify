import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { users, streaks } from '../db/schema.js';
import { processReferral } from './referral.js';

interface TelegramUserInput {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

/**
 * Find or create a user by telegramId.
 * Handles trial setup, streak creation, and referral processing.
 * Returns the user record and whether it was newly created.
 */
export async function findOrCreateUser(
  telegramUser: TelegramUserInput,
  referrer?: string,
): Promise<{ user: typeof users.$inferSelect; isNew: boolean }> {
  let [user] = await db
    .select()
    .from(users)
    .where(eq(users.telegramId, BigInt(telegramUser.id)));

  if (user) {
    return { user, isNew: false };
  }

  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + 7);

  const inserted = await db
    .insert(users)
    .values({
      telegramId: BigInt(telegramUser.id),
      username: telegramUser.username ?? null,
      firstName: telegramUser.first_name,
      lastName: telegramUser.last_name ?? null,
      languageCode: telegramUser.language_code ?? 'en',
      subscriptionStatus: 'trial',
      trialEndsAt,
    })
    .onConflictDoNothing({ target: users.telegramId })
    .returning();

  if (inserted.length > 0) {
    user = inserted[0];

    // Create streak record
    await db.insert(streaks).values({ userId: user.id }).catch(() => {});

    // Process referral if present
    if (referrer && referrer.startsWith('ref_')) {
      const referrerTelegramId = referrer.slice(4);
      await processReferral(referrerTelegramId, user.id).catch(() => {});
    }

    return { user, isNew: true };
  }

  // Race condition: another request created the user
  [user] = await db
    .select()
    .from(users)
    .where(eq(users.telegramId, BigInt(telegramUser.id)));

  return { user, isNew: false };
}
