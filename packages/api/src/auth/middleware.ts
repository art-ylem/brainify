import { createHmac, timingSafeEqual } from 'node:crypto';
import type { FastifyRequest, FastifyReply } from 'fastify';

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

export interface AuthPayload {
  telegramUser: TelegramUser;
  authDate: number;
}

declare module 'fastify' {
  interface FastifyRequest {
    auth: AuthPayload;
  }
}

function validateInitData(initData: string, botToken: string): TelegramUser | null {
  return validateInitDataWithReason(initData, botToken).user;
}

function validateInitDataWithReason(initData: string, botToken: string): { user: TelegramUser | null; reason?: string } {
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) return { user: null, reason: 'missing hash' };

  params.delete('hash');
  const entries = Array.from(params.entries());
  entries.sort(([a], [b]) => a.localeCompare(b));
  const dataCheckString = entries.map(([k, v]) => `${k}=${v}`).join('\n');

  const secretKey = createHmac('sha256', 'WebAppData').update(botToken).digest();
  const computedHash = createHmac('sha256', secretKey).update(dataCheckString).digest();

  const hashBuffer = Buffer.from(hash, 'hex');
  if (hashBuffer.length !== computedHash.length || !timingSafeEqual(computedHash, hashBuffer)) return { user: null, reason: 'invalid hash' };

  const authDate = Number(params.get('auth_date'));
  const maxAge = 86400; // 24 hours
  if (Date.now() / 1000 - authDate > maxAge) return { user: null, reason: `expired (auth_date=${authDate}, age=${Math.floor(Date.now() / 1000 - authDate)}s)` };

  const userStr = params.get('user');
  if (!userStr) return { user: null, reason: 'missing user field' };

  try {
    return { user: JSON.parse(userStr) as TelegramUser };
  } catch {
    return { user: null, reason: 'invalid user JSON' };
  }
}

export async function authMiddleware(request: FastifyRequest, reply: FastifyReply) {
  const botToken = process.env.BOT_TOKEN;
  if (!botToken) {
    request.log.error('BOT_TOKEN not configured');
    return reply.code(500).send({ error: 'Server configuration error' });
  }

  const authorization = request.headers.authorization;
  if (!authorization) {
    request.log.warn('Auth rejected: missing authorization header');
    return reply.code(401).send({ error: 'Missing authorization header' });
  }

  const initData = authorization.startsWith('tma ')
    ? authorization.slice(4)
    : authorization;

  const { user, reason } = validateInitDataWithReason(initData, botToken);
  if (!user) {
    request.log.warn({ reason }, 'Auth rejected: invalid initData');
    return reply.code(401).send({ error: 'Invalid initData' });
  }

  request.auth = {
    telegramUser: user,
    authDate: Number(new URLSearchParams(initData).get('auth_date')),
  };
}
