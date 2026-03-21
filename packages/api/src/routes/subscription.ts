import type { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { activateSubscription, getSubscriptionInfo } from '../services/subscription.js';
import { authMiddleware } from '../auth/index.js';

const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET ?? '';

export async function internalRoutes(app: FastifyInstance) {
  // Internal endpoint — called by bot after successful payment
  app.post('/api/internal/activate-subscription', async (request, reply) => {
    const secret = request.headers['x-internal-secret'];
    if (!INTERNAL_SECRET || secret !== INTERNAL_SECRET) {
      return reply.code(403).send({ error: 'Forbidden' });
    }

    const { telegramId, provider, paymentId, durationDays } = request.body as {
      telegramId: string;
      provider: string;
      paymentId: string;
      durationDays: number;
    };

    if (!telegramId || !provider || !paymentId || !durationDays) {
      return reply.code(400).send({ error: 'Missing required fields' });
    }

    // Find user by telegramId
    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.telegramId, BigInt(telegramId)));

    if (!user) {
      return reply.code(404).send({ error: 'User not found' });
    }

    await activateSubscription(user.id, provider, paymentId, durationDays);

    return { ok: true };
  });

  // GET subscription status for webapp
  app.get('/api/subscription', { preHandler: authMiddleware }, async (request) => {
    const { telegramUser } = request.auth;

    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.telegramId, BigInt(telegramUser.id)));

    if (!user) {
      return { status: 'free', trialEndsAt: null, isPremium: false };
    }

    return getSubscriptionInfo(user.id);
  });
}
