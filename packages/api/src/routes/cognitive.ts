import type { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { users, taskAttempts } from '../db/schema.js';
import { authMiddleware } from '../auth/index.js';
import {
  getCognitiveProfile,
  getPercentiles,
  getOverallRating,
} from '../services/cognitive-profile.js';

export async function cognitiveRoutes(app: FastifyInstance) {
  app.get('/api/profile/cognitive', { preHandler: authMiddleware }, async (request, reply) => {
    const { telegramUser } = request.auth;

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.telegramId, BigInt(telegramUser.id)));

    if (!user) {
      return reply.code(404).send({ error: 'User not found' });
    }

    const [totalAttemptsResult] = await db
      .select({ count: db.$count(taskAttempts, eq(taskAttempts.userId, user.id)) })
      .from(taskAttempts)
      .where(eq(taskAttempts.userId, user.id))
      .limit(1);

    const totalAttempts = Number(totalAttemptsResult?.count ?? 0);

    const categories = await getCognitiveProfile(user.id);
    const percentiles = await getPercentiles(user.id);
    const { overallRating, recommendation } = getOverallRating(categories);

    return {
      categories,
      percentiles,
      overallRating,
      totalAttempts,
      recommendation,
    };
  });
}
