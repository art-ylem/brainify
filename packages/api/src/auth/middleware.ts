import { createHmac, timingSafeEqual } from 'node:crypto';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { verifyJwt } from './jwt.js';

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

  // Strategy 1: Telegram Mini App initData (tma <initData>)
  if (authorization.startsWith('tma ')) {
    const initData = authorization.slice(4);
    const { user, reason } = validateInitDataWithReason(initData, botToken);
    if (!user) {
      request.log.warn({ reason }, 'Auth rejected: invalid initData');
      return reply.code(401).send({ error: 'Invalid initData' });
    }
    request.auth = {
      telegramUser: user,
      authDate: Number(new URLSearchParams(initData).get('auth_date')),
    };
    return;
  }

  // Strategy 2: JWT Bearer token (Bearer <jwt>)
  if (authorization.startsWith('Bearer ')) {
    const token = authorization.slice(7);
    const payload = await verifyJwt(token);
    if (!payload || !payload.sub) {
      request.log.warn('Auth rejected: invalid JWT');
      return reply.code(401).send({ error: 'Invalid token' });
    }
    const telegramId = Number(payload.sub);
    if (!Number.isFinite(telegramId)) {
      request.log.warn('Auth rejected: invalid telegramId in JWT');
      return reply.code(401).send({ error: 'Invalid token' });
    }
    request.auth = {
      telegramUser: { id: telegramId, first_name: '' },
      authDate: payload.iat ?? Math.floor(Date.now() / 1000),
    };
    return;
  }

  // Legacy: try parsing as bare initData (without "tma " prefix)
  const { user, reason } = validateInitDataWithReason(authorization, botToken);
  if (!user) {
    request.log.warn({ reason }, 'Auth rejected: invalid authorization');
    return reply.code(401).send({ error: 'Invalid authorization' });
  }

  request.auth = {
    telegramUser: user,
    authDate: Number(new URLSearchParams(authorization).get('auth_date')),
  };
}

/**
 * Optional auth middleware — tries to authenticate but does NOT return 401 on failure.
 * Sets request.auth if valid credentials are provided, otherwise leaves it undefined.
 */
export async function optionalAuthMiddleware(request: FastifyRequest, _reply: FastifyReply) {
  const botToken = process.env.BOT_TOKEN;
  if (!botToken) return;

  const authorization = request.headers.authorization;
  if (!authorization) return;

  // Strategy 1: TMA
  if (authorization.startsWith('tma ')) {
    const initData = authorization.slice(4);
    const { user } = validateInitDataWithReason(initData, botToken);
    if (user) {
      request.auth = {
        telegramUser: user,
        authDate: Number(new URLSearchParams(initData).get('auth_date')),
      };
    }
    return;
  }

  // Strategy 2: Bearer JWT
  if (authorization.startsWith('Bearer ')) {
    const token = authorization.slice(7);
    const payload = await verifyJwt(token);
    if (payload?.sub) {
      const telegramId = Number(payload.sub);
      if (Number.isFinite(telegramId)) {
        request.auth = {
          telegramUser: { id: telegramId, first_name: '' },
          authDate: payload.iat ?? Math.floor(Date.now() / 1000),
        };
      }
    }
    return;
  }

  // Legacy: bare initData
  const { user } = validateInitDataWithReason(authorization, botToken);
  if (user) {
    request.auth = {
      telegramUser: user,
      authDate: Number(new URLSearchParams(authorization).get('auth_date')),
    };
  }
}
