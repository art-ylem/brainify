import type { FastifyInstance } from 'fastify';
import { eq, and } from 'drizzle-orm';
import { db } from '../db/index.js';
import { tasks, taskSessions, users } from '../db/schema.js';
import { authMiddleware } from '../auth/index.js';
import { taskRegistry } from '@brainify/shared';
import { getRecommendedDifficulty } from '../services/difficulty.js';
import { redis } from '../db/redis.js';
import { randomUUID } from 'node:crypto';

const CATEGORIES = ['memory', 'attention', 'logic', 'speed'] as const;
const SESSION_TTL_MS = 10 * 60 * 1000;
const TRAINING_TTL_S = 3600; // 1 hour TTL for training meta

interface TrainingMeta {
  id: string;
  userId: number;
  sessions: Array<{
    sessionId: number;
    taskId: number;
    taskType: string;
    category: string;
    difficulty: number;
  }>;
  startedAt: string;
}

export async function trainingRoutes(app: FastifyInstance) {
  /**
   * POST /api/training-session/start
   * Creates a training series of 4 tasks (one per category).
   */
  app.post('/api/training-session/start', { preHandler: authMiddleware }, async (request, reply) => {
    const { telegramUser } = request.auth;

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.telegramId, BigInt(telegramUser.id)));

    if (!user) {
      return reply.code(404).send({ error: 'User not found' });
    }

    // Get all active tasks
    const allTasks = await db
      .select()
      .from(tasks)
      .where(eq(tasks.isActive, true));

    const sessionsData: TrainingMeta['sessions'] = [];
    const clientSessions: Array<{
      sessionId: number;
      taskId: number;
      type: string;
      category: string;
      difficulty: number;
      data: Record<string, unknown>;
      timeLimitMs: number | null;
    }> = [];

    for (const cat of CATEGORIES) {
      const catTasks = allTasks.filter((t) => t.category === cat);
      if (catTasks.length === 0) continue;

      // Pick random task from this category
      const task = catTasks[Math.floor(Math.random() * catTasks.length)];

      // Get recommended difficulty
      const difficulty = await getRecommendedDifficulty(user.id, task.type);

      const taskDef = taskRegistry[task.type];
      if (!taskDef) continue;

      const generated = taskDef.generate({ difficulty });

      // Create DB session
      const [session] = await db
        .insert(taskSessions)
        .values({
          userId: user.id,
          taskId: task.id,
          taskType: task.type,
          difficulty,
          generatedData: generated,
          expiresAt: new Date(Date.now() + SESSION_TTL_MS),
        })
        .returning();

      sessionsData.push({
        sessionId: session.id,
        taskId: task.id,
        taskType: task.type,
        category: cat,
        difficulty,
      });

      const clientData = taskDef.sanitizeForClient(generated.data);
      clientSessions.push({
        sessionId: session.id,
        taskId: task.id,
        type: task.type,
        category: cat,
        difficulty,
        data: clientData,
        timeLimitMs: generated.timeLimitMs ?? null,
      });
    }

    // Store training meta in Redis
    const trainingId = randomUUID();
    const meta: TrainingMeta = {
      id: trainingId,
      userId: user.id,
      sessions: sessionsData,
      startedAt: new Date().toISOString(),
    };

    await redis.setex(`training:${trainingId}`, TRAINING_TTL_S, JSON.stringify(meta));

    return {
      trainingId,
      sessions: clientSessions,
    };
  });

  /**
   * GET /api/training-session/:id/summary
   * Returns summary after all 4 tasks are completed.
   */
  app.get('/api/training-session/:id/summary', { preHandler: authMiddleware }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { telegramUser } = request.auth;

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.telegramId, BigInt(telegramUser.id)));

    if (!user) {
      return reply.code(404).send({ error: 'User not found' });
    }

    const cached = await redis.get(`training:${id}`);
    if (!cached) {
      return reply.code(404).send({ error: 'Training session not found or expired' });
    }

    const meta: TrainingMeta = JSON.parse(cached);
    if (meta.userId !== user.id) {
      return reply.code(403).send({ error: 'Access denied' });
    }

    // Check status of each session
    const results: Array<{
      category: string;
      taskType: string;
      difficulty: number;
      status: 'completed' | 'active' | 'expired';
      score: number | null;
      timeMs: number | null;
    }> = [];

    let totalScore = 0;
    let totalTimeMs = 0;
    let completedCount = 0;

    for (const s of meta.sessions) {
      const [session] = await db
        .select()
        .from(taskSessions)
        .where(and(eq(taskSessions.id, s.sessionId), eq(taskSessions.userId, user.id)));

      if (!session) {
        results.push({
          category: s.category,
          taskType: s.taskType,
          difficulty: s.difficulty,
          status: 'expired',
          score: null,
          timeMs: null,
        });
        continue;
      }

      if (session.status === 'completed') {
        // Find the attempt for this session
        const { taskAttempts: ta } = await import('../db/schema.js');
        const [attempt] = await db
          .select()
          .from(ta)
          .where(and(eq(ta.sessionId, s.sessionId), eq(ta.userId, user.id)));

        completedCount++;
        const score = attempt?.score ?? 0;
        const timeMs = attempt?.timeMs ?? 0;
        totalScore += score;
        totalTimeMs += timeMs;

        results.push({
          category: s.category,
          taskType: s.taskType,
          difficulty: s.difficulty,
          status: 'completed',
          score,
          timeMs,
        });
      } else {
        results.push({
          category: s.category,
          taskType: s.taskType,
          difficulty: s.difficulty,
          status: session.status as 'active' | 'expired',
          score: null,
          timeMs: null,
        });
      }
    }

    return {
      trainingId: id,
      totalSessions: meta.sessions.length,
      completedSessions: completedCount,
      allCompleted: completedCount === meta.sessions.length,
      totalScore,
      totalTimeMs,
      results,
      startedAt: meta.startedAt,
    };
  });
}
