import type { FastifyInstance } from 'fastify';
import { eq, sql, desc } from 'drizzle-orm';
import { db } from '../db/index.js';
import { taskAttempts, tasks, users, streaks } from '../db/schema.js';
import { authMiddleware } from '../auth/index.js';

export async function progressRoutes(app: FastifyInstance) {
  app.get('/api/progress', { preHandler: authMiddleware }, async (request, reply) => {
    const { telegramUser } = request.auth;

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.telegramId, BigInt(telegramUser.id)));

    if (!user) {
      return reply.code(404).send({ error: 'User not found' });
    }

    // Daily aggregation (last 30 days)
    const daily = await db
      .select({
        date: sql<string>`DATE(${taskAttempts.completedAt})`.as('date'),
        totalScore: sql<number>`SUM(${taskAttempts.score})`.as('total_score'),
        count: sql<number>`COUNT(*)`.as('count'),
      })
      .from(taskAttempts)
      .where(eq(taskAttempts.userId, user.id))
      .groupBy(sql`DATE(${taskAttempts.completedAt})`)
      .orderBy(desc(sql`DATE(${taskAttempts.completedAt})`))
      .limit(30);

    // By category aggregation
    const byCategory = await db
      .select({
        category: tasks.category,
        totalScore: sql<number>`SUM(${taskAttempts.score})`.as('total_score'),
        count: sql<number>`COUNT(*)`.as('count'),
        avgTimeMs: sql<number>`AVG(${taskAttempts.timeMs})`.as('avg_time_ms'),
      })
      .from(taskAttempts)
      .innerJoin(tasks, eq(taskAttempts.taskId, tasks.id))
      .where(eq(taskAttempts.userId, user.id))
      .groupBy(tasks.category);

    // Streak
    const [streak] = await db
      .select()
      .from(streaks)
      .where(eq(streaks.userId, user.id));

    return {
      daily: daily.map((d) => ({
        date: d.date,
        totalScore: Number(d.totalScore),
        count: Number(d.count),
      })),
      byCategory: byCategory.map((c) => ({
        category: c.category,
        totalScore: Number(c.totalScore),
        count: Number(c.count),
        avgTimeMs: Math.round(Number(c.avgTimeMs)),
      })),
      streak: streak
        ? {
            current: streak.currentStreak,
            longest: streak.longestStreak,
            lastActivityDate: streak.lastActivityDate?.toISOString() ?? null,
          }
        : { current: 0, longest: 0, lastActivityDate: null },
    };
  });
}
