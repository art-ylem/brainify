import type { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { authMiddleware } from '../auth/index.js';
import { getUserAchievements } from '../services/achievements.js';

export async function achievementRoutes(app: FastifyInstance) {
  app.get('/api/achievements', { preHandler: authMiddleware }, async (request, reply) => {
    const { telegramUser } = request.auth;

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.telegramId, BigInt(telegramUser.id)));

    if (!user) {
      return reply.code(404).send({ error: 'User not found' });
    }

    return getUserAchievements(user.id);
  });
}
