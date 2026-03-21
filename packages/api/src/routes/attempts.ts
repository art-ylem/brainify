import type { FastifyInstance } from 'fastify';
import { eq, and } from 'drizzle-orm';
import { db } from '../db/index.js';
import { taskAttempts, users, taskSessions } from '../db/schema.js';
import { authMiddleware } from '../auth/index.js';
import { taskRegistry } from '@brainify/shared';
import type { GeneratedTask } from '@brainify/shared';
import { updateStreak } from '../services/streaks.js';
import { checkAchievements } from '../services/achievements.js';

export async function attemptRoutes(app: FastifyInstance) {
  app.post('/api/attempts', { preHandler: authMiddleware }, async (request, reply) => {
    const { telegramUser } = request.auth;
    const body = request.body as {
      sessionId?: unknown;
      answer?: unknown;
      timeMs?: unknown;
    };

    // Validate input types
    if (
      typeof body.sessionId !== 'number' ||
      !Number.isInteger(body.sessionId) ||
      body.sessionId <= 0
    ) {
      return reply.code(400).send({ error: 'sessionId must be a positive integer' });
    }

    if (typeof body.timeMs !== 'number' || !Number.isFinite(body.timeMs) || body.timeMs <= 0) {
      return reply.code(400).send({ error: 'timeMs must be a positive number' });
    }

    if (body.answer === undefined || body.answer === null) {
      return reply.code(400).send({ error: 'answer is required' });
    }

    // Look up user
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.telegramId, BigInt(telegramUser.id)));

    if (!user) {
      return reply.code(404).send({ error: 'User not found' });
    }

    // Fetch session and verify ownership + status
    const [session] = await db
      .select()
      .from(taskSessions)
      .where(and(eq(taskSessions.id, body.sessionId), eq(taskSessions.userId, user.id)));

    if (!session) {
      return reply.code(404).send({ error: 'Session not found' });
    }

    if (session.status !== 'active') {
      return reply.code(409).send({ error: 'Session already completed' });
    }

    if (new Date() > session.expiresAt) {
      // Mark expired
      await db.update(taskSessions).set({ status: 'expired' }).where(eq(taskSessions.id, session.id));
      return reply.code(410).send({ error: 'Session expired' });
    }

    // Get task definition
    const taskDef = taskRegistry[session.taskType];
    if (!taskDef) {
      return reply.code(500).send({ error: 'Unknown task type' });
    }

    // Validate answer against the stored generated task
    const generated = session.generatedData as GeneratedTask;
    const result = taskDef.validate(generated, body.answer, body.timeMs);

    // Mark session completed
    await db
      .update(taskSessions)
      .set({ status: 'completed' })
      .where(eq(taskSessions.id, session.id));

    // Save attempt
    const [attempt] = await db
      .insert(taskAttempts)
      .values({
        userId: user.id,
        taskId: session.taskId,
        sessionId: session.id,
        score: result.score,
        timeMs: Math.round(body.timeMs),
        difficulty: session.difficulty,
      })
      .returning();

    // Update streak
    await updateStreak(user.id);

    // Check achievements
    await checkAchievements(user.id);

    return {
      id: attempt.id,
      taskId: attempt.taskId,
      score: result.score,
      timeMs: attempt.timeMs,
      difficulty: attempt.difficulty,
      isCorrect: result.isCorrect,
      details: result.details ?? null,
      completedAt: attempt.completedAt.toISOString(),
    };
  });
}
