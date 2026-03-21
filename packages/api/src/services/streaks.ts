import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { streaks } from '../db/schema.js';

/**
 * Update streak for a user after completing a task.
 * Extracts the streak update logic so it can be reused.
 */
export async function updateStreak(userId: number): Promise<{
  currentStreak: number;
  longestStreak: number;
}> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [streak] = await db
    .select()
    .from(streaks)
    .where(eq(streaks.userId, userId));

  if (!streak) {
    // Create initial streak
    const [created] = await db
      .insert(streaks)
      .values({
        userId,
        currentStreak: 1,
        longestStreak: 1,
        lastActivityDate: new Date(),
      })
      .returning();

    return {
      currentStreak: created.currentStreak,
      longestStreak: created.longestStreak,
    };
  }

  const lastActivity = streak.lastActivityDate
    ? new Date(streak.lastActivityDate)
    : null;

  if (lastActivity) {
    lastActivity.setHours(0, 0, 0, 0);
  }

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  let newStreak = streak.currentStreak;

  if (!lastActivity || lastActivity < yesterday) {
    // Missed a day or no previous activity — reset
    newStreak = 1;
  } else if (lastActivity.getTime() === yesterday.getTime()) {
    // Consecutive day
    newStreak = streak.currentStreak + 1;
  }
  // If same day — keep unchanged

  const longestStreak = Math.max(newStreak, streak.longestStreak);

  await db
    .update(streaks)
    .set({
      currentStreak: newStreak,
      longestStreak,
      lastActivityDate: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(streaks.userId, userId));

  return { currentStreak: newStreak, longestStreak };
}

export async function getStreak(userId: number) {
  const [streak] = await db
    .select()
    .from(streaks)
    .where(eq(streaks.userId, userId));

  return streak ?? { currentStreak: 0, longestStreak: 0, lastActivityDate: null };
}
