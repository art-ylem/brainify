import { redis } from '../db/redis.js';
import type { GeneratedTask } from '@brainify/shared';

const GUEST_SESSION_TTL = 600; // 10 min
const GUEST_DAILY_LIMIT = 3;
const GUEST_DAILY_TTL = 48 * 3600; // 48h to be safe across timezones

interface GuestSessionData {
  taskId: number;
  taskType: string;
  difficulty: number;
  generatedData: GeneratedTask;
}

export async function createGuestSession(
  sessionId: string,
  data: GuestSessionData,
): Promise<void> {
  const key = `guest:session:${sessionId}`;
  await redis.set(key, JSON.stringify(data), 'EX', GUEST_SESSION_TTL);
}

export async function getGuestSession(sessionId: string): Promise<GuestSessionData | null> {
  const key = `guest:session:${sessionId}`;
  const raw = await redis.get(key);
  if (!raw) return null;
  return JSON.parse(raw) as GuestSessionData;
}

export async function deleteGuestSession(sessionId: string): Promise<void> {
  await redis.del(`guest:session:${sessionId}`);
}

export async function getGuestDailyCount(ip: string): Promise<number> {
  const today = new Date().toISOString().slice(0, 10);
  const key = `guest:daily:${ip}:${today}`;
  const count = await redis.get(key);
  return count ? Number(count) : 0;
}

export async function incrementGuestDailyCount(ip: string): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  const key = `guest:daily:${ip}:${today}`;
  await redis.incr(key);
  await redis.expire(key, GUEST_DAILY_TTL);
}

export { GUEST_DAILY_LIMIT };
