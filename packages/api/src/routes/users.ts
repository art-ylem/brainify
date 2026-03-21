import type { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { users, streaks } from '../db/schema.js';
import { authMiddleware } from '../auth/index.js';
import { processReferral } from '../services/referral.js';

export async function userRoutes(app: FastifyInstance) {
  app.get('/api/user/me', { preHandler: authMiddleware }, async (request) => {
    const { telegramUser } = request.auth;

    let [user] = await db
      .select()
      .from(users)
      .where(eq(users.telegramId, BigInt(telegramUser.id)));

    let isNewUser = false;

    if (!user) {
      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + 7);

      // Use onConflictDoNothing to handle race conditions
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
        isNewUser = true;
        await db.insert(streaks).values({ userId: user.id });
      } else {
        // Race condition: another request created the user
        [user] = await db
          .select()
          .from(users)
          .where(eq(users.telegramId, BigInt(telegramUser.id)));
      }
    }

    // Process referral for new users
    if (isNewUser) {
      const referrer = request.headers['x-referrer'] as string | undefined;
      if (referrer && referrer.startsWith('ref_')) {
        const referrerTelegramId = referrer.slice(4);
        await processReferral(referrerTelegramId, user.id).catch(() => {});
      }
    }

    return {
      id: user.id,
      telegramId: user.telegramId.toString(),
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      languageCode: user.languageCode,
      subscriptionStatus: user.subscriptionStatus,
      trialEndsAt: user.trialEndsAt?.toISOString() ?? null,
      createdAt: user.createdAt.toISOString(),
    };
  });
}
