import type { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { tasks, taskSessions, users } from '../db/schema.js';
import { authMiddleware } from '../auth/index.js';
import { taskRegistry } from '@brainify/shared';
import { getCognitiveProfile, getOverallRating } from '../services/cognitive-profile.js';

const CATEGORIES = ['memory', 'attention', 'logic', 'speed'] as const;
const ONBOARDING_DIFFICULTY = 2;
const SESSION_TTL_MS = 10 * 60 * 1000;

export async function onboardingRoutes(app: FastifyInstance) {
  /**
   * POST /api/onboarding/start
   * Creates 4 sessions (one per category) at difficulty 2.
   */
  app.post('/api/onboarding/start', { preHandler: authMiddleware }, async (request, reply) => {
    const { telegramUser } = request.auth;

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.telegramId, BigInt(telegramUser.id)));

    if (!user) {
      return reply.code(404).send({ error: 'User not found' });
    }

    if (user.onboardingCompleted) {
      return reply.code(409).send({ error: 'Onboarding already completed' });
    }

    const allTasks = await db
      .select()
      .from(tasks)
      .where(eq(tasks.isActive, true));

    const sessions: Array<{
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

      const task = catTasks[Math.floor(Math.random() * catTasks.length)];
      const taskDef = taskRegistry[task.type];
      if (!taskDef) continue;

      const generated = taskDef.generate({ difficulty: ONBOARDING_DIFFICULTY });

      const [session] = await db
        .insert(taskSessions)
        .values({
          userId: user.id,
          taskId: task.id,
          taskType: task.type,
          difficulty: ONBOARDING_DIFFICULTY,
          generatedData: generated,
          expiresAt: new Date(Date.now() + SESSION_TTL_MS),
        })
        .returning();

      const clientData = taskDef.sanitizeForClient(generated.data);
      sessions.push({
        sessionId: session.id,
        taskId: task.id,
        type: task.type,
        category: cat,
        difficulty: ONBOARDING_DIFFICULTY,
        data: clientData,
        timeLimitMs: generated.timeLimitMs ?? null,
      });
    }

    return { sessions };
  });

  /**
   * POST /api/onboarding/complete
   * Marks onboarding as completed and returns initial cognitive profile.
   */
  app.post('/api/onboarding/complete', { preHandler: authMiddleware }, async (request, reply) => {
    const { telegramUser } = request.auth;

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.telegramId, BigInt(telegramUser.id)));

    if (!user) {
      return reply.code(404).send({ error: 'User not found' });
    }

    if (user.onboardingCompleted) {
      return reply.code(409).send({ error: 'Onboarding already completed' });
    }

    // Mark onboarding completed
    await db
      .update(users)
      .set({ onboardingCompleted: true, updatedAt: new Date() })
      .where(eq(users.id, user.id));

    // Calculate initial cognitive profile
    const categories = await getCognitiveProfile(user.id);
    const { overallRating, recommendation } = getOverallRating(categories);

    return {
      categories,
      overallRating,
      recommendation,
    };
  });
}
