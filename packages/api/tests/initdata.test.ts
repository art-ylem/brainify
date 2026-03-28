import { describe, it, expect } from 'vitest';
import { createHmac, timingSafeEqual } from 'node:crypto';

// Inline initData validation logic (matches middleware.ts) to avoid importing DB deps
interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
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
  if (hashBuffer.length !== computedHash.length || !timingSafeEqual(computedHash, hashBuffer)) {
    return { user: null, reason: 'invalid hash' };
  }

  const authDate = Number(params.get('auth_date'));
  const maxAge = 86400;
  if (Date.now() / 1000 - authDate > maxAge) return { user: null, reason: `expired` };

  const userStr = params.get('user');
  if (!userStr) return { user: null, reason: 'missing user field' };

  try {
    return { user: JSON.parse(userStr) as TelegramUser };
  } catch {
    return { user: null, reason: 'invalid user JSON' };
  }
}

// Helper: build valid initData string with correct hash
function buildInitData(user: TelegramUser, botToken: string, authDate?: number): string {
  const now = authDate ?? Math.floor(Date.now() / 1000);
  const params = new URLSearchParams();
  params.set('user', JSON.stringify(user));
  params.set('auth_date', String(now));

  const entries = Array.from(params.entries());
  entries.sort(([a], [b]) => a.localeCompare(b));
  const dataCheckString = entries.map(([k, v]) => `${k}=${v}`).join('\n');

  const secretKey = createHmac('sha256', 'WebAppData').update(botToken).digest();
  const hash = createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
  params.set('hash', hash);

  return params.toString();
}

const BOT_TOKEN = 'test_bot_token_1234567890:ABCdef';

describe('validateInitData (TMA auth)', () => {
  it('validates correct initData', () => {
    const user: TelegramUser = { id: 123456, first_name: 'John', username: 'john' };
    const initData = buildInitData(user, BOT_TOKEN);
    const result = validateInitDataWithReason(initData, BOT_TOKEN);
    expect(result.user).not.toBeNull();
    expect(result.user!.id).toBe(123456);
    expect(result.user!.first_name).toBe('John');
  });

  it('rejects initData with missing hash', () => {
    const result = validateInitDataWithReason('user=%7B%7D&auth_date=12345', BOT_TOKEN);
    expect(result.user).toBeNull();
    expect(result.reason).toBe('missing hash');
  });

  it('rejects initData with invalid hash', () => {
    const result = validateInitDataWithReason(
      `user=${encodeURIComponent('{"id":1,"first_name":"X"}')}&auth_date=${Math.floor(Date.now() / 1000)}&hash=${'a'.repeat(64)}`,
      BOT_TOKEN,
    );
    expect(result.user).toBeNull();
    expect(result.reason).toBe('invalid hash');
  });

  it('rejects expired initData (>24h)', () => {
    const user: TelegramUser = { id: 1, first_name: 'X' };
    const expired = Math.floor(Date.now() / 1000) - 86401;
    const initData = buildInitData(user, BOT_TOKEN, expired);
    const result = validateInitDataWithReason(initData, BOT_TOKEN);
    expect(result.user).toBeNull();
    expect(result.reason).toContain('expired');
  });

  it('rejects initData with missing user field', () => {
    const now = Math.floor(Date.now() / 1000);
    const params = new URLSearchParams();
    params.set('auth_date', String(now));
    const entries = Array.from(params.entries());
    entries.sort(([a], [b]) => a.localeCompare(b));
    const dataCheckString = entries.map(([k, v]) => `${k}=${v}`).join('\n');
    const secretKey = createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();
    const hash = createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
    params.set('hash', hash);
    const result = validateInitDataWithReason(params.toString(), BOT_TOKEN);
    expect(result.user).toBeNull();
    expect(result.reason).toBe('missing user field');
  });

  it('rejects initData with invalid user JSON', () => {
    const now = Math.floor(Date.now() / 1000);
    const params = new URLSearchParams();
    params.set('user', 'not-json');
    params.set('auth_date', String(now));
    const entries = Array.from(params.entries());
    entries.sort(([a], [b]) => a.localeCompare(b));
    const dataCheckString = entries.map(([k, v]) => `${k}=${v}`).join('\n');
    const secretKey = createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();
    const hash = createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
    params.set('hash', hash);
    const result = validateInitDataWithReason(params.toString(), BOT_TOKEN);
    expect(result.user).toBeNull();
    expect(result.reason).toBe('invalid user JSON');
  });

  it('rejects initData with wrong bot token', () => {
    const user: TelegramUser = { id: 1, first_name: 'X' };
    const initData = buildInitData(user, BOT_TOKEN);
    const result = validateInitDataWithReason(initData, 'wrong_token');
    expect(result.user).toBeNull();
    expect(result.reason).toBe('invalid hash');
  });

  it('detects tampered user field', () => {
    const user: TelegramUser = { id: 1, first_name: 'Alice' };
    const initData = buildInitData(user, BOT_TOKEN);
    // Replace user in initData
    const tampered = initData.replace(encodeURIComponent('"Alice"'), encodeURIComponent('"Eve"'));
    const result = validateInitDataWithReason(tampered, BOT_TOKEN);
    expect(result.user).toBeNull();
    expect(result.reason).toBe('invalid hash');
  });
});
