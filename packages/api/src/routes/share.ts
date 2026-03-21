import type { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { authMiddleware } from '../auth/index.js';

export async function shareRoutes(app: FastifyInstance) {
  // GET /api/share?score=N&task=name — returns share metadata
  // In production, this would generate a PNG card via sharp/canvas.
  // For now, returns structured data for the client-side share button.
  app.get('/api/share', { preHandler: authMiddleware }, async (request, reply) => {
    const { telegramUser } = request.auth;
    const query = request.query as { score?: string; task?: string };

    const score = Number(query.score) || 0;
    const taskName = typeof query.task === 'string' ? query.task : '';

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.telegramId, BigInt(telegramUser.id)));

    if (!user) {
      return reply.code(404).send({ error: 'User not found' });
    }

    const botUsername = process.env.BOT_USERNAME ?? 'BrainifyBot';
    const text = taskName
      ? `🧠 ${user.firstName ?? 'Игрок'} набрал ${score} очков в «${taskName}» на Brainify!`
      : `🧠 ${user.firstName ?? 'Игрок'} набрал ${score} очков в Brainify!`;

    return {
      shareUrl: `https://t.me/share/url?url=https://t.me/${encodeURIComponent(botUsername)}&text=${encodeURIComponent(text)}`,
      text,
    };
  });
}
