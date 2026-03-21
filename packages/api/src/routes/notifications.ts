import type { FastifyInstance } from 'fastify';
import { sql, lt, gt, and, isNotNull } from 'drizzle-orm';
import { db } from '../db/index.js';
import { users, taskAttempts, streaks } from '../db/schema.js';

const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET ?? '';

function checkSecret(request: { headers: Record<string, unknown> }, reply: { code: (n: number) => { send: (b: unknown) => unknown } }): boolean {
  const secret = request.headers['x-internal-secret'];
  if (!INTERNAL_SECRET || secret !== INTERNAL_SECRET) {
    reply.code(403).send({ error: 'Forbidden' });
    return false;
  }
  return true;
}

export async function notificationRoutes(app: FastifyInstance) {
  // Users who haven't done any task in the last 24 hours
  app.get('/api/internal/inactive-users', async (request, reply) => {
    if (!checkSecret(request as never, reply as never)) return;

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const result = await db
      .select({
        telegramId: sql<string>`${users.telegramId}::text`,
        firstName: users.firstName,
        languageCode: users.languageCode,
      })
      .from(users)
      .where(
        sql`${users.id} NOT IN (
          SELECT DISTINCT ${taskAttempts.userId}
          FROM ${taskAttempts}
          WHERE ${taskAttempts.completedAt} > ${oneDayAgo}
        )`,
      )
      .limit(500);

    return result;
  });

  // Users whose leaderboard rank dropped (simplified: returns users pushed down by others' recent activity)
  // Stores previous ranks in Redis; for MVP, returns empty — rank tracking to be implemented with leaderboard caching
  app.get('/api/internal/rank-drops', async (request, reply) => {
    if (!checkSecret(request as never, reply as never)) return;

    // MVP: rank drop detection requires previous rank snapshots.
    // Return empty for now — will be populated when leaderboard caching is added.
    return [];
  });

  // Users with active streak who haven't trained today
  app.get('/api/internal/streak-at-risk', async (request, reply) => {
    if (!checkSecret(request as never, reply as never)) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const result = await db
      .select({
        telegramId: sql<string>`${users.telegramId}::text`,
        firstName: users.firstName,
        currentStreak: streaks.currentStreak,
      })
      .from(streaks)
      .innerJoin(users, sql`${users.id} = ${streaks.userId}`)
      .where(
        and(
          gt(streaks.currentStreak, 0),
          // Last activity was before today (hasn't trained today yet)
          lt(streaks.lastActivityDate, today),
          isNotNull(streaks.lastActivityDate),
        ),
      )
      .limit(500);

    return result;
  });
}
