import { eq, and, desc } from 'drizzle-orm';
import { db } from '../db/index.js';
import { taskAttempts, tasks } from '../db/schema.js';
import type { TaskType } from '@brainify/shared';

/**
 * Returns recommended difficulty (1-5) for a user on a given task type.
 * Logic: look at last 5 attempts for that taskType.
 * If avg score > 80% of max → recommend difficulty + 1
 * If avg score < 40% of max → recommend difficulty - 1
 * Otherwise → keep current difficulty
 * No attempts → 1
 */
export async function getRecommendedDifficulty(userId: number, taskType: string): Promise<number> {
  const recent = await db
    .select({
      score: taskAttempts.score,
      difficulty: taskAttempts.difficulty,
    })
    .from(taskAttempts)
    .innerJoin(tasks, eq(taskAttempts.taskId, tasks.id))
    .where(and(eq(taskAttempts.userId, userId), eq(tasks.type, taskType as TaskType)))
    .orderBy(desc(taskAttempts.completedAt))
    .limit(5);

  if (recent.length === 0) return 1;

  const avgScore = recent.reduce((sum, r) => sum + r.score, 0) / recent.length;
  const currentDifficulty = recent[0].difficulty;

  // Max score is ~100 for all task types
  const maxScore = 100;
  const ratio = avgScore / maxScore;

  if (ratio > 0.8 && currentDifficulty < 5) {
    return currentDifficulty + 1;
  }
  if (ratio < 0.4 && currentDifficulty > 1) {
    return currentDifficulty - 1;
  }

  return currentDifficulty;
}

/**
 * Returns the last used difficulty for a user on a given task type.
 */
export async function getLastDifficulty(userId: number, taskType: string): Promise<number | null> {
  const [last] = await db
    .select({ difficulty: taskAttempts.difficulty })
    .from(taskAttempts)
    .innerJoin(tasks, eq(taskAttempts.taskId, tasks.id))
    .where(and(eq(taskAttempts.userId, userId), eq(tasks.type, taskType as TaskType)))
    .orderBy(desc(taskAttempts.completedAt))
    .limit(1);

  return last?.difficulty ?? null;
}
