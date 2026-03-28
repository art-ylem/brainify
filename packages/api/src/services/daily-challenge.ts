import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { tasks } from '../db/schema.js';
import { redis } from '../db/redis.js';

const BONUS_MULTIPLIER = 1.5;

interface DailyChallenge {
  taskId: number;
  taskType: string;
  category: string;
  difficulty: number;
  bonusMultiplier: number;
}

/**
 * Deterministically pick a daily challenge based on date seed.
 */
export async function getDailyChallenge(): Promise<DailyChallenge> {
  const allTasks = await db.select().from(tasks).where(eq(tasks.isActive, true));
  if (allTasks.length === 0) throw new Error('No tasks available');

  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const seed = hashDateSeed(today);
  const task = allTasks[seed % allTasks.length];

  return {
    taskId: task.id,
    taskType: task.type,
    category: task.category,
    difficulty: 3,
    bonusMultiplier: BONUS_MULTIPLIER,
  };
}

/**
 * Check if user has completed today's daily challenge.
 */
export async function isDailyChallengeCompleted(userId: number): Promise<boolean> {
  const today = new Date().toISOString().slice(0, 10);
  const key = `challenge:daily:${userId}:${today}`;
  const val = await redis.get(key);
  return val !== null;
}

/**
 * Mark daily challenge as completed. Store score for reference.
 */
export async function markDailyChallengeCompleted(userId: number, score: number): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  const key = `challenge:daily:${userId}:${today}`;
  await redis.set(key, String(score), 'EX', 48 * 60 * 60); // 48h TTL
}

/**
 * Apply bonus multiplier to score if this attempt is for the daily challenge.
 */
export function applyDailyBonus(score: number): number {
  return Math.round(score * BONUS_MULTIPLIER);
}

/**
 * Mark a task session as a daily challenge session (Redis key, 1h TTL).
 */
export async function markSessionAsDailyChallenge(sessionId: number): Promise<void> {
  await redis.set(`challenge:session:${sessionId}`, '1', 'EX', 3600);
}

/**
 * Check if a task session was started as a daily challenge.
 */
export async function isSessionDailyChallenge(sessionId: number): Promise<boolean> {
  const val = await redis.get(`challenge:session:${sessionId}`);
  return val !== null;
}

function hashDateSeed(dateStr: string): number {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    const char = dateStr.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}
