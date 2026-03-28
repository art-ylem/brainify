import { eq, and, gte, sql, desc } from 'drizzle-orm';
import { db } from '../db/index.js';
import { taskAttempts, tasks } from '../db/schema.js';
import { redis } from '../db/redis.js';
import { getMaxScore } from '@brainify/shared';
import type { TaskType, TaskCategory } from '@brainify/shared';

const CATEGORIES: TaskCategory[] = ['memory', 'attention', 'logic', 'speed'];

// Difficulty weight multipliers: higher difficulty = higher weight
const DIFFICULTY_WEIGHTS: Record<number, number> = {
  1: 1.0,
  2: 1.5,
  3: 2.0,
  4: 2.5,
  5: 3.0,
};

export interface CognitiveProfile {
  memory: number;
  attention: number;
  logic: number;
  speed: number;
}

export interface Percentiles {
  memory: number;
  attention: number;
  logic: number;
  speed: number;
}

/**
 * Calculates the cognitive profile (0-100 per category) for a user.
 * Uses attempts from the last 30 days.
 * Formula per category:
 *   normScore = (rawScore / maxScore) * difficultyWeight
 *   categoryRating = clamp(avg(normScores) / maxWeight * 100, 0, 100)
 */
export async function getCognitiveProfile(userId: number): Promise<CognitiveProfile> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const attempts = await db
    .select({
      score: taskAttempts.score,
      difficulty: taskAttempts.difficulty,
      category: tasks.category,
      taskType: tasks.type,
    })
    .from(taskAttempts)
    .innerJoin(tasks, eq(taskAttempts.taskId, tasks.id))
    .where(
      and(
        eq(taskAttempts.userId, userId),
        gte(taskAttempts.completedAt, thirtyDaysAgo),
      ),
    );

  const profile: CognitiveProfile = { memory: 0, attention: 0, logic: 0, speed: 0 };

  for (const cat of CATEGORIES) {
    const catAttempts = attempts.filter((a) => a.category === cat);
    if (catAttempts.length === 0) {
      profile[cat] = 0;
      continue;
    }

    const normScores = catAttempts.map((a) => {
      const maxScore = getMaxScore(a.taskType as TaskType, a.difficulty);
      const weight = DIFFICULTY_WEIGHTS[a.difficulty] ?? 1.0;
      return (a.score / maxScore) * weight;
    });

    const avgNorm = normScores.reduce((s, v) => s + v, 0) / normScores.length;
    // Max possible normalized value is 3.0 (difficulty 5 with perfect score)
    const maxWeight = DIFFICULTY_WEIGHTS[5];
    profile[cat] = Math.round(Math.min(100, (avgNorm / maxWeight) * 100));
  }

  return profile;
}

/**
 * Calculates percentile rankings for a user across all categories.
 * Uses Redis-cached aggregation of all user scores (1h TTL).
 * Percentile = % of users whose avg score is below this user's score.
 */
export async function getPercentiles(userId: number): Promise<Percentiles> {
  const userProfile = await getCognitiveProfile(userId);
  const percentiles: Percentiles = { memory: 0, attention: 0, logic: 0, speed: 0 };

  for (const cat of CATEGORIES) {
    if (userProfile[cat] === 0) {
      percentiles[cat] = 0;
      continue;
    }

    const cacheKey = `percentiles:category:${cat}`;
    let distribution: number[] | null = null;

    // Try to get cached distribution
    const cached = await redis.get(cacheKey);
    if (cached) {
      try {
        distribution = JSON.parse(cached);
      } catch {
        // cache corrupted, recalculate
      }
    }

    if (!distribution) {
      distribution = await calculateCategoryDistribution(cat);
      await redis.setex(cacheKey, 3600, JSON.stringify(distribution));
    }

    if (distribution.length === 0) {
      percentiles[cat] = 50; // default if no data
      continue;
    }

    const belowCount = distribution.filter((s) => s < userProfile[cat]).length;
    percentiles[cat] = Math.round((belowCount / distribution.length) * 100);
  }

  return percentiles;
}

/**
 * Calculates the distribution of average normalized scores for all users in a category.
 * Returns an array of average scores (one per user).
 */
async function calculateCategoryDistribution(category: TaskCategory): Promise<number[]> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const rows = await db
    .select({
      userId: taskAttempts.userId,
      avgScore: sql<number>`AVG(${taskAttempts.score})`.as('avg_score'),
      avgDifficulty: sql<number>`AVG(${taskAttempts.difficulty})`.as('avg_difficulty'),
    })
    .from(taskAttempts)
    .innerJoin(tasks, eq(taskAttempts.taskId, tasks.id))
    .where(
      and(
        eq(tasks.category, category),
        gte(taskAttempts.completedAt, thirtyDaysAgo),
      ),
    )
    .groupBy(taskAttempts.userId);

  return rows.map((r) => {
    const weight = DIFFICULTY_WEIGHTS[Math.round(Number(r.avgDifficulty))] ?? 1.0;
    const norm = (Number(r.avgScore) / 100) * weight;
    return Math.round(Math.min(100, (norm / DIFFICULTY_WEIGHTS[5]) * 100));
  });
}

/**
 * Returns overall rating (average of 4 categories) and recommendation key.
 */
export function getOverallRating(profile: CognitiveProfile): {
  overallRating: number;
  recommendation: string;
} {
  const values = CATEGORIES.map((c) => profile[c]);
  const overallRating = Math.round(values.reduce((s, v) => s + v, 0) / values.length);

  let recommendation: string;
  if (overallRating > 80) {
    recommendation = 'recommendation.expert';
  } else if (overallRating >= 50) {
    recommendation = 'recommendation.intermediate';
  } else {
    recommendation = 'recommendation.beginner';
  }

  return { overallRating, recommendation };
}

/**
 * Returns weekly and monthly trend for each category.
 * Trend = current period avg - previous period avg (as %).
 */
export async function getCategoryTrends(userId: number): Promise<{
  weeklyTrend: CognitiveProfile;
  monthlyTrend: CognitiveProfile;
}> {
  const now = new Date();

  const oneWeekAgo = new Date(now);
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  const twoWeeksAgo = new Date(now);
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

  const oneMonthAgo = new Date(now);
  oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);

  const twoMonthsAgo = new Date(now);
  twoMonthsAgo.setDate(twoMonthsAgo.getDate() - 60);

  const weeklyTrend: CognitiveProfile = { memory: 0, attention: 0, logic: 0, speed: 0 };
  const monthlyTrend: CognitiveProfile = { memory: 0, attention: 0, logic: 0, speed: 0 };

  const allAttempts = await db
    .select({
      score: taskAttempts.score,
      difficulty: taskAttempts.difficulty,
      category: tasks.category,
      completedAt: taskAttempts.completedAt,
    })
    .from(taskAttempts)
    .innerJoin(tasks, eq(taskAttempts.taskId, tasks.id))
    .where(
      and(
        eq(taskAttempts.userId, userId),
        gte(taskAttempts.completedAt, twoMonthsAgo),
      ),
    )
    .orderBy(desc(taskAttempts.completedAt));

  for (const cat of CATEGORIES) {
    const catAttempts = allAttempts.filter((a) => a.category === cat);

    // Weekly trend
    const thisWeek = catAttempts.filter((a) => a.completedAt >= oneWeekAgo);
    const lastWeek = catAttempts.filter((a) => a.completedAt >= twoWeeksAgo && a.completedAt < oneWeekAgo);
    weeklyTrend[cat] = computeTrendPercent(thisWeek, lastWeek);

    // Monthly trend
    const thisMonth = catAttempts.filter((a) => a.completedAt >= oneMonthAgo);
    const lastMonth = catAttempts.filter((a) => a.completedAt >= twoMonthsAgo && a.completedAt < oneMonthAgo);
    monthlyTrend[cat] = computeTrendPercent(thisMonth, lastMonth);
  }

  return { weeklyTrend, monthlyTrend };
}

function computeTrendPercent(
  current: Array<{ score: number; difficulty: number }>,
  previous: Array<{ score: number; difficulty: number }>,
): number {
  if (current.length === 0 || previous.length === 0) return 0;

  const avgCurrent = current.reduce((s, a) => s + a.score, 0) / current.length;
  const avgPrevious = previous.reduce((s, a) => s + a.score, 0) / previous.length;

  if (avgPrevious === 0) return 0;
  return Math.round(((avgCurrent - avgPrevious) / avgPrevious) * 100);
}
