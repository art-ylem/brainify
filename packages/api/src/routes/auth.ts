import type { FastifyInstance } from 'fastify';
import { validateTelegramLogin, type TelegramLoginData } from '../auth/telegram-login.js';
import { signJwt } from '../auth/jwt.js';
import { findOrCreateUser } from '../services/users.js';

export async function authRoutes(app: FastifyInstance) {
  app.post('/api/auth/telegram', async (request, reply) => {
    const botToken = process.env.BOT_TOKEN;
    if (!botToken) {
      request.log.error('BOT_TOKEN not configured');
      return reply.code(500).send({ error: 'Server configuration error' });
    }

    const body = request.body as TelegramLoginData | null;
    if (!body || !body.id || !body.first_name || !body.auth_date || !body.hash) {
      return reply.code(400).send({ error: 'Invalid request body' });
    }

    if (!validateTelegramLogin(body, botToken)) {
      request.log.warn({ telegramId: body.id }, 'Telegram Login validation failed');
      return reply.code(401).send({ error: 'Invalid Telegram login data' });
    }

    const { user } = await findOrCreateUser({
      id: body.id,
      first_name: body.first_name,
      last_name: body.last_name,
      username: body.username,
    });

    const token = await signJwt({ telegramId: body.id });

    return {
      token,
      user: {
        id: user.id,
        telegramId: user.telegramId.toString(),
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        languageCode: user.languageCode,
        subscriptionStatus: user.subscriptionStatus,
        trialEndsAt: user.trialEndsAt?.toISOString() ?? null,
        createdAt: user.createdAt.toISOString(),
      },
    };
  });
}
