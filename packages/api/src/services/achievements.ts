import { eq, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { achievements, taskAttempts, streaks, duels } from '../db/schema.js';

// Achievement definitions
const ACHIEVEMENT_DEFS = [
  { type: 'first_task', check: checkFirstTask, name: 'First Task' },
  { type: 'streak_3', check: checkStreak(3), name: '3-Day Streak' },
  { type: 'streak_7', check: checkStreak(7), name: '7-Day Streak' },
  { type: 'streak_30', check: checkStreak(30), name: '30-Day Streak' },
  { type: 'tasks_10', check: checkTaskCount(10), name: '10 Tasks' },
  { type: 'tasks_100', check: checkTaskCount(100), name: '100 Tasks' },
  { type: 'duel_winner', check: checkDuelWinner, name: 'First Duel Win' },
] as const;

/**
 * Check and grant any newly earned achievements for a user.
 * Called after each attempt submission.
 */
export async function checkAchievements(userId: number): Promise<string[]> {
  // Get already-earned achievements
  const earned = await db
    .select({ achievementType: achievements.achievementType })
    .from(achievements)
    .where(eq(achievements.userId, userId));

  const earnedSet = new Set(earned.map((a) => a.achievementType));
  const newAchievements: string[] = [];

  for (const def of ACHIEVEMENT_DEFS) {
    if (earnedSet.has(def.type)) continue;

    const qualifies = await def.check(userId);
    if (qualifies) {
      await db.insert(achievements).values({
        userId,
        achievementType: def.type,
      }).onConflictDoNothing();
      newAchievements.push(def.type);
    }
  }

  return newAchievements;
}

export async function getUserAchievements(userId: number) {
  const rows = await db
    .select()
    .from(achievements)
    .where(eq(achievements.userId, userId));

  return rows.map((a) => ({
    type: a.achievementType,
    unlockedAt: a.unlockedAt.toISOString(),
  }));
}

// --- Check functions ---

async function checkFirstTask(userId: number): Promise<boolean> {
  const [row] = await db
    .select({ c: sql<number>`CAST(COUNT(*) AS INTEGER)` })
    .from(taskAttempts)
    .where(eq(taskAttempts.userId, userId));
  return row.c >= 1;
}

function checkStreak(days: number) {
  return async (userId: number): Promise<boolean> => {
    const [streak] = await db
      .select()
      .from(streaks)
      .where(eq(streaks.userId, userId));
    return !!streak && streak.longestStreak >= days;
  };
}

function checkTaskCount(count: number) {
  return async (userId: number): Promise<boolean> => {
    const [row] = await db
      .select({ c: sql<number>`CAST(COUNT(*) AS INTEGER)` })
      .from(taskAttempts)
      .where(eq(taskAttempts.userId, userId));
    return row.c >= count;
  };
}

async function checkDuelWinner(userId: number): Promise<boolean> {
  // Won as challenger (challengerScore > opponentScore)
  const [asChallenger] = await db
    .select({ c: sql<number>`CAST(COUNT(*) AS INTEGER)` })
    .from(duels)
    .where(sql`${duels.challengerId} = ${userId} AND ${duels.status} = 'completed' AND ${duels.challengerScore} > ${duels.opponentScore}`);

  if (asChallenger.c > 0) return true;

  // Won as opponent (opponentScore > challengerScore)
  const [asOpponent] = await db
    .select({ c: sql<number>`CAST(COUNT(*) AS INTEGER)` })
    .from(duels)
    .where(sql`${duels.opponentId} = ${userId} AND ${duels.status} = 'completed' AND ${duels.opponentScore} > ${duels.challengerScore}`);

  return asOpponent.c > 0;
}
