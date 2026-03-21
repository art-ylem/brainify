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
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) return null;

  params.delete('hash');
  const entries = Array.from(params.entries());
  entries.sort(([a], [b]) => a.localeCompare(b));
  const dataCheckString = entries.map(([k, v]) => `${k}=${v}`).join('\n');

  const secretKey = createHmac('sha256', 'WebAppData').update(botToken).digest();
  const computedHash = createHmac('sha256', secretKey).update(dataCheckString).digest();

  const hashBuffer = Buffer.from(hash, 'hex');
  if (hashBuffer.length !== computedHash.length || !timingSafeEqual(computedHash, hashBuffer)) return null;

  const authDate = Number(params.get('auth_date'));
  const maxAge = 86400; // 24 hours
  if (Date.now() / 1000 - authDate > maxAge) return null;

  const userStr = params.get('user');
  if (!userStr) return null;

  try {
    return JSON.parse(userStr) as TelegramUser;
  } catch {
    return null;
  }
}

export async function authMiddleware(request: FastifyRequest, reply: FastifyReply) {
  const botToken = process.env.BOT_TOKEN;
  if (!botToken) {
    return reply.code(500).send({ error: 'Server configuration error' });
  }

  const authorization = request.headers.authorization;
  if (!authorization) {
    return reply.code(401).send({ error: 'Missing authorization header' });
  }

  const initData = authorization.startsWith('tma ')
    ? authorization.slice(4)
    : authorization;

  const user = validateInitData(initData, botToken);
  if (!user) {
    return reply.code(401).send({ error: 'Invalid initData' });
  }

  request.auth = {
    telegramUser: user,
    authDate: Number(new URLSearchParams(initData).get('auth_date')),
  };
}
