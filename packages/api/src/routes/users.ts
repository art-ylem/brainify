import type { FastifyInstance } from 'fastify';
import { authMiddleware } from '../auth/index.js';
import { findOrCreateUser } from '../services/users.js';

export async function userRoutes(app: FastifyInstance) {
  app.get('/api/user/me', { preHandler: authMiddleware }, async (request) => {
    const { telegramUser } = request.auth;
    const referrer = request.headers['x-referrer'] as string | undefined;

    const { user, isNew } = await findOrCreateUser(telegramUser, referrer);

    if (isNew) {
      request.log.info({ telegramId: telegramUser.id }, 'New user created');
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
      onboardingCompleted: user.onboardingCompleted,
      createdAt: user.createdAt.toISOString(),
    };
  });
}
