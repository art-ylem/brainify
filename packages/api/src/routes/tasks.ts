import type { FastifyInstance } from 'fastify';
import { eq, and } from 'drizzle-orm';
import { db } from '../db/index.js';
import { tasks, taskSessions, users } from '../db/schema.js';
import { optionalAuthMiddleware } from '../auth/index.js';
import { taskRegistry } from '@brainify/shared';
import { checkTaskLimit, incrementDailyTaskCount } from '../middleware/subscription.js';
import { createGuestSession, incrementGuestDailyCount } from '../services/guest-session.js';
import { getRecommendedDifficulty, getLastDifficulty } from '../services/difficulty.js';
import { getDailyChallenge, markSessionAsDailyChallenge } from '../services/daily-challenge.js';
import { randomUUID } from 'node:crypto';

const VALID_CATEGORIES = ['memory', 'attention', 'logic', 'speed'] as const;

/** Session TTL — 10 minutes */
const SESSION_TTL_MS = 10 * 60 * 1000;

export async function taskRoutes(app: FastifyInstance) {
  app.get('/api/tasks', { preHandler: optionalAuthMiddleware }, async (request, reply) => {
    const { category } = request.query as { category?: string };

    if (category && !VALID_CATEGORIES.includes(category as (typeof VALID_CATEGORIES)[number])) {
      return reply.code(400).send({ error: 'Invalid category' });
    }

    const conditions = [eq(tasks.isActive, true)];
    if (category) {
      conditions.push(eq(tasks.category, category as (typeof VALID_CATEGORIES)[number]));
    }

    const result = await db.select().from(tasks).where(and(...conditions));

    // Enrich with recommendations for authenticated users
    let userId: number | null = null;
    if (request.auth) {
      const [user] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.telegramId, BigInt(request.auth.telegramUser.id)));
      userId = user?.id ?? null;
    }

    const enriched = await Promise.all(
      result.map(async (task) => {
        const base = {
          id: task.id,
          type: task.type,
          category: task.category,
          name: task.name,
          descriptionKey: task.descriptionKey,
        };
        if (!userId) return base;

        const [recommended, last] = await Promise.all([
          getRecommendedDifficulty(userId, task.type),
          getLastDifficulty(userId, task.type),
        ]);
        return {
          ...base,
          recommendedDifficulty: recommended,
          lastDifficulty: last,
        };
      }),
    );

    return enriched;
  });

  app.get('/api/tasks/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const taskId = Number(id);

    if (!Number.isFinite(taskId)) {
      return reply.code(400).send({ error: 'Invalid task ID' });
    }

    const [task] = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, taskId));

    if (!task) {
      return reply.code(404).send({ error: 'Task not found' });
    }

    return {
      id: task.id,
      type: task.type,
      category: task.category,
      name: task.name,
      descriptionKey: task.descriptionKey,
    };
  });

  // Start a new task session — server generates task, stores full data, returns sanitized data to client
  app.post('/api/tasks/:id/start', { preHandler: [optionalAuthMiddleware, checkTaskLimit] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const taskId = Number(id);

    if (!Number.isFinite(taskId)) {
      return reply.code(400).send({ error: 'Invalid task ID' });
    }

    const body = request.body as { difficulty?: unknown; isDailyChallenge?: unknown } | null;
    const difficulty = body?.difficulty !== undefined ? Number(body.difficulty) : 1;
    if (!Number.isInteger(difficulty) || difficulty < 1 || difficulty > 5) {
      return reply.code(400).send({ error: 'difficulty must be an integer between 1 and 5' });
    }
    const isDailyChallenge = body?.isDailyChallenge === true;

    // Verify task exists
    const [task] = await db.select().from(tasks).where(eq(tasks.id, taskId));
    if (!task) {
      return reply.code(404).send({ error: 'Task not found' });
    }

    const taskDef = taskRegistry[task.type];
    if (!taskDef) {
      request.log.error({ taskType: task.type, taskId }, 'Unknown task type — not found in taskRegistry');
      return reply.code(500).send({ error: 'Unknown task type' });
    }

    // Generate full task (with answers)
    const generated = taskDef.generate({ difficulty });

    // Guest mode: store session in Redis only
    if (!request.auth) {
      const guestSessionId = `g_${randomUUID()}`;
      await createGuestSession(guestSessionId, {
        taskId,
        taskType: task.type,
        difficulty,
        generatedData: generated,
      });
      await incrementGuestDailyCount(request.ip);

      const clientData = taskDef.sanitizeForClient(generated.data);
      return {
        sessionId: guestSessionId,
        type: generated.type,
        category: generated.category,
        difficulty: generated.difficulty,
        data: clientData,
        timeLimitMs: generated.timeLimitMs ?? null,
        guest: true,
      };
    }

    const { telegramUser } = request.auth;

    // Look up user
    const [user] = await db.select().from(users).where(eq(users.telegramId, BigInt(telegramUser.id)));
    if (!user) {
      return reply.code(404).send({ error: 'User not found' });
    }

    // Store full task data in session
    const [session] = await db
      .insert(taskSessions)
      .values({
        userId: user.id,
        taskId,
        taskType: task.type,
        difficulty,
        generatedData: generated,
        expiresAt: new Date(Date.now() + SESSION_TTL_MS),
      })
      .returning();

    // Mark session as daily challenge if requested and valid
    if (isDailyChallenge) {
      try {
        const challenge = await getDailyChallenge();
        if (challenge.taskId === taskId && challenge.difficulty === difficulty) {
          await markSessionAsDailyChallenge(session.id);
        }
      } catch {
        // Daily challenge unavailable — ignore
      }
    }

    // Return sanitized data (no answers)
    const clientData = taskDef.sanitizeForClient(generated.data);

    // Increment daily task counter for free tier tracking
    await incrementDailyTaskCount(user.id);

    return {
      sessionId: session.id,
      type: generated.type,
      category: generated.category,
      difficulty: generated.difficulty,
      data: clientData,
      timeLimitMs: generated.timeLimitMs ?? null,
    };
  });
}
