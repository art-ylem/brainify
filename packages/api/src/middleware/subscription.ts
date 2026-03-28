import type { FastifyRequest, FastifyReply } from 'fastify';
import { getSubscriptionInfo } from '../services/subscription.js';
import { redis } from '../db/redis.js';
import { getGuestDailyCount, GUEST_DAILY_LIMIT } from '../services/guest-session.js';

const FREE_DAILY_LIMIT = 3;

/**
 * Get remaining daily tasks for a free user.
 */
async function getDailyTaskCount(userId: number): Promise<number> {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const key = `tasks:daily:${userId}:${today}`;
  const count = await redis.get(key);
  return count ? Number(count) : 0;
}

/**
 * Increment daily task counter after a task session is started.
 */
export async function incrementDailyTaskCount(userId: number): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  const key = `tasks:daily:${userId}:${today}`;
  await redis.incr(key);
  // Expire at end of day (max 48h to be safe across timezones)
  await redis.expire(key, 48 * 3600);
}

/**
 * Middleware: check if user hit the free daily task limit.
 * Should be applied to task session creation endpoint.
 * Supports guest mode: checks by IP if no auth.
 */
export async function checkTaskLimit(request: FastifyRequest, reply: FastifyReply) {
  // Guest mode: check by IP
  if (!request.auth) {
    const ip = request.ip;
    const count = await getGuestDailyCount(ip);
    if (count >= GUEST_DAILY_LIMIT) {
      return reply.code(403).send({
        error: 'Daily guest limit reached',
        limit: GUEST_DAILY_LIMIT,
        guestLimitReached: true,
      });
    }
    return;
  }

  const { telegramUser } = request.auth;
  // auth middleware already ran and set request.auth
  // We need the DB user id — it's resolved from telegramId
  const { eq } = await import('drizzle-orm');
  const { db } = await import('../db/index.js');
  const { users } = await import('../db/schema.js');

  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.telegramId, BigInt(telegramUser.id)));

  if (!user) {
    return reply.code(404).send({ error: 'User not found' });
  }

  const subInfo = await getSubscriptionInfo(user.id);

  if (subInfo.isPremium) return; // No limits for premium/trial users

  const count = await getDailyTaskCount(user.id);
  if (count >= FREE_DAILY_LIMIT) {
    return reply.code(403).send({
      error: 'Daily task limit reached',
      limit: FREE_DAILY_LIMIT,
      subscriptionRequired: true,
    });
  }
}

/**
 * Middleware: block PvP duels for free users.
 */
export async function checkPremiumAccess(request: FastifyRequest, reply: FastifyReply) {
  const { telegramUser } = request.auth;
  const { eq } = await import('drizzle-orm');
  const { db } = await import('../db/index.js');
  const { users } = await import('../db/schema.js');

  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.telegramId, BigInt(telegramUser.id)));

  if (!user) {
    return reply.code(404).send({ error: 'User not found' });
  }

  const subInfo = await getSubscriptionInfo(user.id);

  if (!subInfo.isPremium) {
    return reply.code(403).send({
      error: 'Premium subscription required',
      subscriptionRequired: true,
    });
  }
}
