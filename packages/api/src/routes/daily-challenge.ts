import type { FastifyInstance } from 'fastify';
import { authMiddleware } from '../auth/index.js';
import { getDailyChallenge, isDailyChallengeCompleted } from '../services/daily-challenge.js';

export async function dailyChallengeRoutes(app: FastifyInstance) {
  app.get('/api/daily-challenge', { preHandler: authMiddleware }, async (request, reply) => {
    const { telegramUser } = request.auth;
    const { db } = await import('../db/index.js');
    const { users } = await import('../db/schema.js');
    const { eq } = await import('drizzle-orm');

    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.telegramId, BigInt(telegramUser.id)));

    if (!user) return reply.code(404).send({ error: 'User not found' });

    const challenge = await getDailyChallenge();
    const completed = await isDailyChallengeCompleted(user.id);

    return {
      ...challenge,
      completed,
    };
  });
}
