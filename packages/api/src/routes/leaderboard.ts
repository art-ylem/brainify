import type { FastifyInstance } from 'fastify';
import { eq, sql, and, gte } from 'drizzle-orm';
import { db } from '../db/index.js';
import { taskAttempts, users, friendships } from '../db/schema.js';
import { authMiddleware } from '../auth/index.js';

const VALID_TYPES = ['global', 'friends'] as const;
const VALID_PERIODS = ['week', 'month', 'all'] as const;
const PAGE_SIZE = 20;

function getPeriodStart(period: string): Date | null {
  const now = new Date();
  if (period === 'week') {
    const d = new Date(now);
    d.setDate(d.getDate() - 7);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  if (period === 'month') {
    const d = new Date(now);
    d.setMonth(d.getMonth() - 1);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  return null; // all time
}

export async function leaderboardRoutes(app: FastifyInstance) {
  app.get('/api/leaderboard', { preHandler: authMiddleware }, async (request, reply) => {
    const { telegramUser } = request.auth;
    const query = request.query as { type?: string; period?: string; page?: string };

    const type = query.type ?? 'global';
    const period = query.period ?? 'week';
    const page = Math.max(1, Number(query.page) || 1);

    if (!VALID_TYPES.includes(type as (typeof VALID_TYPES)[number])) {
      return reply.code(400).send({ error: 'Invalid type. Use: global, friends' });
    }
    if (!VALID_PERIODS.includes(period as (typeof VALID_PERIODS)[number])) {
      return reply.code(400).send({ error: 'Invalid period. Use: week, month, all' });
    }

    // Get current user
    const [currentUser] = await db.select().from(users).where(eq(users.telegramId, BigInt(telegramUser.id)));
    if (!currentUser) {
      return reply.code(404).send({ error: 'User not found' });
    }

    const periodStart = getPeriodStart(period);

    // Build conditions
    const conditions = [];
    if (periodStart) {
      conditions.push(gte(taskAttempts.completedAt, periodStart));
    }

    // For friends type, get friend IDs first
    let friendUserIds: number[] = [];
    if (type === 'friends') {
      const friendRows = await db
        .select({ friendId: friendships.friendId })
        .from(friendships)
        .where(eq(friendships.userId, currentUser.id));
      friendUserIds = [currentUser.id, ...friendRows.map((r) => r.friendId)];
    }

    // Aggregate scores
    const baseQuery = db
      .select({
        userId: taskAttempts.userId,
        totalScore: sql<number>`CAST(SUM(${taskAttempts.score}) AS INTEGER)`.as('total_score'),
        taskCount: sql<number>`CAST(COUNT(*) AS INTEGER)`.as('task_count'),
      })
      .from(taskAttempts);

    let rows;
    if (type === 'friends' && friendUserIds.length > 0) {
      const friendConditions = [
        sql`${taskAttempts.userId} IN (${sql.join(friendUserIds.map((id) => sql`${id}`), sql`, `)})`,
        ...(periodStart ? [gte(taskAttempts.completedAt, periodStart)] : []),
      ];
      rows = await baseQuery
        .where(and(...friendConditions))
        .groupBy(taskAttempts.userId)
        .orderBy(sql`total_score DESC`)
        .limit(PAGE_SIZE)
        .offset((page - 1) * PAGE_SIZE);
    } else {
      rows = await baseQuery
        .where(periodStart ? gte(taskAttempts.completedAt, periodStart) : undefined)
        .groupBy(taskAttempts.userId)
        .orderBy(sql`total_score DESC`)
        .limit(PAGE_SIZE)
        .offset((page - 1) * PAGE_SIZE);
    }

    // Enrich with user info
    const userIds = rows.map((r) => r.userId);
    const userRows = userIds.length > 0
      ? await db
          .select({ id: users.id, username: users.username, firstName: users.firstName })
          .from(users)
          .where(sql`${users.id} IN (${sql.join(userIds.map((id) => sql`${id}`), sql`, `)})`)
      : [];

    const userMap = new Map(userRows.map((u) => [u.id, u]));

    const leaderboard = rows.map((row, idx) => {
      const u = userMap.get(row.userId);
      return {
        rank: (page - 1) * PAGE_SIZE + idx + 1,
        userId: row.userId,
        username: u?.username ?? null,
        firstName: u?.firstName ?? '',
        totalScore: row.totalScore,
        taskCount: row.taskCount,
        isCurrentUser: row.userId === currentUser.id,
      };
    });

    // Get current user position if not in current page
    let currentUserPosition = leaderboard.find((e) => e.isCurrentUser) ?? null;
    if (!currentUserPosition) {
      const posQuery = type === 'friends' && friendUserIds.length > 0
        ? db
            .select({ totalScore: sql<number>`CAST(SUM(${taskAttempts.score}) AS INTEGER)` })
            .from(taskAttempts)
            .where(
              and(
                eq(taskAttempts.userId, currentUser.id),
                ...(periodStart ? [gte(taskAttempts.completedAt, periodStart)] : []),
              ),
            )
            .groupBy(taskAttempts.userId)
        : db
            .select({ totalScore: sql<number>`CAST(SUM(${taskAttempts.score}) AS INTEGER)` })
            .from(taskAttempts)
            .where(
              and(
                eq(taskAttempts.userId, currentUser.id),
                ...(periodStart ? [gte(taskAttempts.completedAt, periodStart)] : []),
              ),
            )
            .groupBy(taskAttempts.userId);

      const [myScore] = await posQuery;
      if (myScore) {
        // Count users with higher score
        const rankConditions = [
          sql`SUM(${taskAttempts.score}) > ${myScore.totalScore}`,
          ...(periodStart ? [gte(taskAttempts.completedAt, periodStart)] : []),
        ];
        if (type === 'friends' && friendUserIds.length > 0) {
          rankConditions.push(
            sql`${taskAttempts.userId} IN (${sql.join(friendUserIds.map((id) => sql`${id}`), sql`, `)})`,
          );
        }

        const [{ count }] = await db
          .select({ count: sql<number>`CAST(COUNT(*) AS INTEGER)` })
          .from(
            db
              .select({ userId: taskAttempts.userId, score: sql`SUM(${taskAttempts.score})` })
              .from(taskAttempts)
              .where(
                periodStart
                  ? and(
                      gte(taskAttempts.completedAt, periodStart),
                      ...(type === 'friends' && friendUserIds.length > 0
                        ? [sql`${taskAttempts.userId} IN (${sql.join(friendUserIds.map((id) => sql`${id}`), sql`, `)})`]
                        : []),
                    )
                  : type === 'friends' && friendUserIds.length > 0
                    ? sql`${taskAttempts.userId} IN (${sql.join(friendUserIds.map((id) => sql`${id}`), sql`, `)})`
                    : undefined,
              )
              .groupBy(taskAttempts.userId)
              .having(sql`SUM(${taskAttempts.score}) > ${myScore.totalScore}`)
              .as('higher'),
          );

        currentUserPosition = {
          rank: count + 1,
          userId: currentUser.id,
          username: currentUser.username,
          firstName: currentUser.firstName ?? '',
          totalScore: myScore.totalScore,
          taskCount: 0,
          isCurrentUser: true,
        };
      }
    }

    return {
      type,
      period,
      page,
      entries: leaderboard,
      currentUser: currentUserPosition,
    };
  });
}
