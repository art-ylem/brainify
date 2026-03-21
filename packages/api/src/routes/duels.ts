import type { FastifyInstance } from 'fastify';
import { eq, and, or, sql, desc } from 'drizzle-orm';
import { db } from '../db/index.js';
import { duels, users, tasks, taskSessions, taskAttempts, friendships } from '../db/schema.js';
import { authMiddleware } from '../auth/index.js';
import { taskRegistry } from '@brainify/shared';
import type { GeneratedTask } from '@brainify/shared';
import { checkPremiumAccess } from '../middleware/subscription.js';

const DUEL_EXPIRY_HOURS = 24;

export async function duelRoutes(app: FastifyInstance) {
  // POST /api/duels — create a duel challenge
  app.post('/api/duels', { preHandler: [authMiddleware, checkPremiumAccess] }, async (request, reply) => {
    const { telegramUser } = request.auth;
    const body = request.body as { taskId?: unknown; opponentId?: unknown };

    if (typeof body.taskId !== 'number' || !Number.isInteger(body.taskId) || body.taskId <= 0) {
      return reply.code(400).send({ error: 'taskId must be a positive integer' });
    }
    if (typeof body.opponentId !== 'number' || !Number.isInteger(body.opponentId) || body.opponentId <= 0) {
      return reply.code(400).send({ error: 'opponentId must be a positive integer' });
    }

    const [challenger] = await db.select().from(users).where(eq(users.telegramId, BigInt(telegramUser.id)));
    if (!challenger) {
      return reply.code(404).send({ error: 'User not found' });
    }

    if (challenger.id === body.opponentId) {
      return reply.code(400).send({ error: 'Cannot duel yourself' });
    }

    // Verify opponent exists
    const [opponent] = await db.select().from(users).where(eq(users.id, body.opponentId));
    if (!opponent) {
      return reply.code(404).send({ error: 'Opponent not found' });
    }

    // Verify task exists
    const [task] = await db.select().from(tasks).where(eq(tasks.id, body.taskId));
    if (!task) {
      return reply.code(404).send({ error: 'Task not found' });
    }

    const taskDef = taskRegistry[task.type];
    if (!taskDef) {
      return reply.code(400).send({ error: 'Unknown task type' });
    }

    // Generate task for challenger to play
    const generated = taskDef.generate({ difficulty: 1 });

    // Create session for challenger
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min session
    const [challengerSession] = await db
      .insert(taskSessions)
      .values({
        userId: challenger.id,
        taskId: task.id,
        taskType: task.type,
        difficulty: 1,
        generatedData: generated as unknown as Record<string, unknown>,
        status: 'active',
        expiresAt,
      })
      .returning();

    // Create duel
    const duelExpiresAt = new Date(Date.now() + DUEL_EXPIRY_HOURS * 60 * 60 * 1000);
    const [duel] = await db
      .insert(duels)
      .values({
        challengerId: challenger.id,
        opponentId: body.opponentId,
        taskId: task.id,
        status: 'pending',
        expiresAt: duelExpiresAt,
      })
      .returning();

    const clientData = taskDef.sanitizeForClient(generated);

    return {
      duelId: duel.id,
      sessionId: challengerSession.id,
      task: {
        id: task.id,
        type: task.type,
        category: task.category,
        data: clientData,
      },
      expiresAt: duelExpiresAt.toISOString(),
    };
  });

  // POST /api/duels/:id/challenger-result — submit challenger score
  app.post('/api/duels/:id/challenger-result', { preHandler: authMiddleware }, async (request, reply) => {
    const { telegramUser } = request.auth;
    const duelId = Number((request.params as { id: string }).id);
    const body = request.body as { sessionId?: unknown; answer?: unknown; timeMs?: unknown };

    if (!Number.isInteger(duelId) || duelId <= 0) {
      return reply.code(400).send({ error: 'Invalid duel ID' });
    }
    if (typeof body.sessionId !== 'number' || !Number.isInteger(body.sessionId)) {
      return reply.code(400).send({ error: 'sessionId required' });
    }
    if (typeof body.timeMs !== 'number' || !Number.isFinite(body.timeMs) || body.timeMs <= 0) {
      return reply.code(400).send({ error: 'timeMs must be positive' });
    }
    if (body.answer === undefined || body.answer === null) {
      return reply.code(400).send({ error: 'answer required' });
    }

    const [user] = await db.select().from(users).where(eq(users.telegramId, BigInt(telegramUser.id)));
    if (!user) return reply.code(404).send({ error: 'User not found' });

    const [duel] = await db.select().from(duels).where(and(eq(duels.id, duelId), eq(duels.challengerId, user.id)));
    if (!duel) return reply.code(404).send({ error: 'Duel not found' });
    if (duel.status !== 'pending' && duel.status !== 'accepted') return reply.code(409).send({ error: 'Duel is not active' });
    if (duel.challengerScore !== null) return reply.code(409).send({ error: 'Challenger already submitted' });

    // Validate via session
    const [session] = await db.select().from(taskSessions)
      .where(and(eq(taskSessions.id, body.sessionId), eq(taskSessions.userId, user.id)));
    if (!session) return reply.code(404).send({ error: 'Session not found' });
    if (session.status !== 'active') return reply.code(409).send({ error: 'Session already completed' });

    const taskDef = taskRegistry[session.taskType];
    if (!taskDef) return reply.code(500).send({ error: 'Unknown task type' });

    const generated = session.generatedData as GeneratedTask;
    const result = taskDef.validate(generated, body.answer, body.timeMs);

    // Mark session completed
    await db.update(taskSessions).set({ status: 'completed' }).where(eq(taskSessions.id, session.id));

    // Update duel with challenger score
    await db.update(duels).set({
      challengerScore: result.score,
      challengerTimeMs: Math.round(body.timeMs),
    }).where(eq(duels.id, duelId));

    // Save attempt
    await db.insert(taskAttempts).values({
      userId: user.id,
      taskId: duel.taskId,
      sessionId: session.id,
      score: result.score,
      timeMs: Math.round(body.timeMs),
      difficulty: session.difficulty,
    });

    return {
      duelId,
      score: result.score,
      isCorrect: result.isCorrect,
      details: result.details ?? null,
    };
  });

  // POST /api/duels/:id/accept — opponent accepts and plays duel
  app.post('/api/duels/:id/accept', { preHandler: authMiddleware }, async (request, reply) => {
    const { telegramUser } = request.auth;
    const duelId = Number((request.params as { id: string }).id);

    if (!Number.isInteger(duelId) || duelId <= 0) {
      return reply.code(400).send({ error: 'Invalid duel ID' });
    }

    const [user] = await db.select().from(users).where(eq(users.telegramId, BigInt(telegramUser.id)));
    if (!user) return reply.code(404).send({ error: 'User not found' });

    const [duel] = await db.select().from(duels).where(and(eq(duels.id, duelId), eq(duels.opponentId, user.id)));
    if (!duel) return reply.code(404).send({ error: 'Duel not found' });
    if (duel.status !== 'pending') return reply.code(409).send({ error: 'Duel not in pending state' });
    if (new Date() > duel.expiresAt) {
      await db.update(duels).set({ status: 'expired' }).where(eq(duels.id, duelId));
      return reply.code(410).send({ error: 'Duel expired' });
    }

    // Get task
    const [task] = await db.select().from(tasks).where(eq(tasks.id, duel.taskId));
    if (!task) return reply.code(500).send({ error: 'Task not found' });

    const taskDef = taskRegistry[task.type];
    if (!taskDef) return reply.code(500).send({ error: 'Unknown task type' });

    // Generate fresh task for opponent
    const generated = taskDef.generate({ difficulty: 1 });

    // Create session for opponent
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    const [session] = await db
      .insert(taskSessions)
      .values({
        userId: user.id,
        taskId: task.id,
        taskType: task.type,
        difficulty: 1,
        generatedData: generated as unknown as Record<string, unknown>,
        status: 'active',
        expiresAt,
      })
      .returning();

    // Update duel status
    await db.update(duels).set({ status: 'accepted' }).where(eq(duels.id, duelId));

    const clientData = taskDef.sanitizeForClient(generated);

    // Add friendship if not exists (both directions)
    const challengerId = duel.challengerId;
    await db.insert(friendships).values([
      { userId: challengerId, friendId: user.id },
      { userId: user.id, friendId: challengerId },
    ]).onConflictDoNothing();

    return {
      duelId,
      sessionId: session.id,
      task: {
        id: task.id,
        type: task.type,
        category: task.category,
        data: clientData,
      },
    };
  });

  // POST /api/duels/:id/opponent-result — submit opponent result
  app.post('/api/duels/:id/opponent-result', { preHandler: authMiddleware }, async (request, reply) => {
    const { telegramUser } = request.auth;
    const duelId = Number((request.params as { id: string }).id);
    const body = request.body as { sessionId?: unknown; answer?: unknown; timeMs?: unknown };

    if (!Number.isInteger(duelId) || duelId <= 0) {
      return reply.code(400).send({ error: 'Invalid duel ID' });
    }
    if (typeof body.sessionId !== 'number' || !Number.isInteger(body.sessionId)) {
      return reply.code(400).send({ error: 'sessionId required' });
    }
    if (typeof body.timeMs !== 'number' || !Number.isFinite(body.timeMs) || body.timeMs <= 0) {
      return reply.code(400).send({ error: 'timeMs must be positive' });
    }
    if (body.answer === undefined || body.answer === null) {
      return reply.code(400).send({ error: 'answer required' });
    }

    const [user] = await db.select().from(users).where(eq(users.telegramId, BigInt(telegramUser.id)));
    if (!user) return reply.code(404).send({ error: 'User not found' });

    const [duel] = await db.select().from(duels).where(and(eq(duels.id, duelId), eq(duels.opponentId, user.id)));
    if (!duel) return reply.code(404).send({ error: 'Duel not found' });
    if (duel.status !== 'accepted') return reply.code(409).send({ error: 'Duel not accepted' });

    // Validate via session
    const [session] = await db.select().from(taskSessions)
      .where(and(eq(taskSessions.id, body.sessionId), eq(taskSessions.userId, user.id)));
    if (!session) return reply.code(404).send({ error: 'Session not found' });
    if (session.status !== 'active') return reply.code(409).send({ error: 'Session already completed' });

    const taskDef = taskRegistry[session.taskType];
    if (!taskDef) return reply.code(500).send({ error: 'Unknown task type' });

    const generated = session.generatedData as GeneratedTask;
    const result = taskDef.validate(generated, body.answer, body.timeMs);

    // Mark session completed
    await db.update(taskSessions).set({ status: 'completed' }).where(eq(taskSessions.id, session.id));

    // Update duel with opponent score and complete
    await db.update(duels).set({
      opponentScore: result.score,
      opponentTimeMs: Math.round(body.timeMs),
      status: 'completed',
      completedAt: new Date(),
    }).where(eq(duels.id, duelId));

    // Save attempt
    await db.insert(taskAttempts).values({
      userId: user.id,
      taskId: duel.taskId,
      sessionId: session.id,
      score: result.score,
      timeMs: Math.round(body.timeMs),
      difficulty: session.difficulty,
    });

    // Determine winner
    const challengerScore = duel.challengerScore ?? 0;
    let outcome: 'won' | 'lost' | 'draw';
    if (result.score > challengerScore) outcome = 'won';
    else if (result.score < challengerScore) outcome = 'lost';
    else outcome = 'draw';

    return {
      duelId,
      outcome,
      yourScore: result.score,
      opponentScore: challengerScore,
      isCorrect: result.isCorrect,
      details: result.details ?? null,
    };
  });

  // GET /api/duels — list user's duels
  app.get('/api/duels', { preHandler: authMiddleware }, async (request, reply) => {
    const { telegramUser } = request.auth;

    const [user] = await db.select().from(users).where(eq(users.telegramId, BigInt(telegramUser.id)));
    if (!user) return reply.code(404).send({ error: 'User not found' });

    const rows = await db
      .select()
      .from(duels)
      .where(or(eq(duels.challengerId, user.id), eq(duels.opponentId, user.id)))
      .orderBy(desc(duels.createdAt))
      .limit(50);

    // Gather all user IDs involved
    const userIdsSet = new Set<number>();
    for (const d of rows) {
      userIdsSet.add(d.challengerId);
      userIdsSet.add(d.opponentId);
    }
    const userIds = [...userIdsSet];

    const duelUsers = userIds.length > 0
      ? await db
          .select({ id: users.id, username: users.username, firstName: users.firstName })
          .from(users)
          .where(sql`${users.id} IN (${sql.join(userIds.map((id) => sql`${id}`), sql`, `)})`)
      : [];

    const userMap = new Map(duelUsers.map((u) => [u.id, u]));

    // Get task names
    const taskIdsSet = new Set(rows.map((d) => d.taskId));
    const taskIds = [...taskIdsSet];
    const duelTasks = taskIds.length > 0
      ? await db
          .select({ id: tasks.id, type: tasks.type, name: tasks.name })
          .from(tasks)
          .where(sql`${tasks.id} IN (${sql.join(taskIds.map((id) => sql`${id}`), sql`, `)})`)
      : [];
    const taskMap = new Map(duelTasks.map((t) => [t.id, t]));

    const list = rows.map((d) => {
      const isChallenger = d.challengerId === user.id;
      const opponentUserId = isChallenger ? d.opponentId : d.challengerId;
      const opp = userMap.get(opponentUserId);
      const task = taskMap.get(d.taskId);

      return {
        id: d.id,
        status: d.status,
        role: isChallenger ? 'challenger' : 'opponent',
        opponent: {
          userId: opponentUserId,
          username: opp?.username ?? null,
          firstName: opp?.firstName ?? '',
        },
        task: task ? { id: task.id, type: task.type, name: task.name } : null,
        challengerScore: d.challengerScore,
        opponentScore: d.opponentScore,
        expiresAt: d.expiresAt.toISOString(),
        createdAt: d.createdAt.toISOString(),
        completedAt: d.completedAt?.toISOString() ?? null,
      };
    });

    return { duels: list };
  });
}
