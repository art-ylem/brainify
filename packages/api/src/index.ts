import { config } from 'dotenv';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

config({ path: resolve(dirname(fileURLToPath(import.meta.url)), '../../../.env') });

import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { userRoutes } from './routes/users.js';
import { taskRoutes } from './routes/tasks.js';
import { attemptRoutes } from './routes/attempts.js';
import { progressRoutes } from './routes/progress.js';
import { leaderboardRoutes } from './routes/leaderboard.js';
import { duelRoutes } from './routes/duels.js';
import { friendRoutes } from './routes/friends.js';
import { achievementRoutes } from './routes/achievements.js';
import { shareRoutes } from './routes/share.js';
import { internalRoutes } from './routes/subscription.js';
import { notificationRoutes } from './routes/notifications.js';

const app = Fastify({ logger: true });

await app.register(cors, { origin: process.env.WEBAPP_URL ?? 'https://brinify.ellow.tech' });
await app.register(rateLimit, { max: 100, timeWindow: '1 minute' });

// Routes
await app.register(userRoutes);
await app.register(taskRoutes);
await app.register(attemptRoutes);
await app.register(progressRoutes);
await app.register(leaderboardRoutes);
await app.register(duelRoutes);
await app.register(friendRoutes);
await app.register(achievementRoutes);
await app.register(shareRoutes);
await app.register(internalRoutes);
await app.register(notificationRoutes);

// Health check
app.get('/health', async () => {
  const checks: Record<string, string> = { api: 'ok' };

  try {
    const { db } = await import('./db/index.js');
    const { sql } = await import('drizzle-orm');
    await db.execute(sql`SELECT 1`);
    checks.db = 'ok';
  } catch {
    checks.db = 'error';
  }

  try {
    const { redis } = await import('./db/redis.js');
    await redis.ping();
    checks.redis = 'ok';
  } catch {
    checks.redis = 'error';
  }

  const allOk = Object.values(checks).every((v) => v === 'ok');
  return { status: allOk ? 'ok' : 'degraded', checks };
});

const host = process.env.API_HOST ?? '0.0.0.0';
const port = Number(process.env.API_PORT ?? 3000);

try {
  await app.listen({ host, port });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
