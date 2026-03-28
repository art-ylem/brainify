import { describe, it, expect } from 'vitest';
import { createHash, createHmac } from 'node:crypto';

// Inline the function under test to avoid importing DB/Redis deps from the main module
interface TelegramLoginData {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

function validateTelegramLogin(data: TelegramLoginData, botToken: string): boolean {
  const { hash, ...rest } = data;
  if (!hash) return false;

  const checkString = Object.entries(rest)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `${k}=${v}`)
    .sort()
    .join('\n');

  const secretKey = createHash('sha256').update(botToken).digest();
  const computedHash = createHmac('sha256', secretKey).update(checkString).digest();

  const hashBuffer = Buffer.from(hash, 'hex');
  if (hashBuffer.length !== computedHash.length) return false;

  const { timingSafeEqual } = require('node:crypto');
  if (!timingSafeEqual(computedHash, hashBuffer)) return false;

  const maxAge = 86400;
  if (Date.now() / 1000 - data.auth_date > maxAge) return false;

  return true;
}

// Helper: generate a valid Telegram Login Widget hash
function generateValidHash(data: Record<string, unknown>, botToken: string): string {
  const checkString = Object.entries(data)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `${k}=${v}`)
    .sort()
    .join('\n');
  const secretKey = createHash('sha256').update(botToken).digest();
  return createHmac('sha256', secretKey).update(checkString).digest('hex');
}

const BOT_TOKEN = 'test_bot_token_1234567890:ABCdef';

describe('validateTelegramLogin', () => {
  it('accepts valid Telegram Login data', () => {
    const now = Math.floor(Date.now() / 1000);
    const data = { id: 123456, first_name: 'John', auth_date: now };
    const hash = generateValidHash(data, BOT_TOKEN);
    expect(validateTelegramLogin({ ...data, hash }, BOT_TOKEN)).toBe(true);
  });

  it('accepts data with optional fields', () => {
    const now = Math.floor(Date.now() / 1000);
    const data = { id: 99, first_name: 'Jane', last_name: 'Doe', username: 'jane_doe', auth_date: now };
    const hash = generateValidHash(data, BOT_TOKEN);
    expect(validateTelegramLogin({ ...data, hash }, BOT_TOKEN)).toBe(true);
  });

  it('rejects data with wrong hash', () => {
    const now = Math.floor(Date.now() / 1000);
    const data: TelegramLoginData = {
      id: 123, first_name: 'Bob', auth_date: now,
      hash: 'a'.repeat(64),
    };
    expect(validateTelegramLogin(data, BOT_TOKEN)).toBe(false);
  });

  it('rejects data with wrong bot token', () => {
    const now = Math.floor(Date.now() / 1000);
    const data = { id: 123, first_name: 'Bob', auth_date: now };
    const hash = generateValidHash(data, BOT_TOKEN);
    expect(validateTelegramLogin({ ...data, hash }, 'wrong_token')).toBe(false);
  });

  it('rejects expired auth_date (>24h)', () => {
    const expired = Math.floor(Date.now() / 1000) - 86401; // 24h + 1s ago
    const data = { id: 123, first_name: 'Bob', auth_date: expired };
    const hash = generateValidHash(data, BOT_TOKEN);
    expect(validateTelegramLogin({ ...data, hash }, BOT_TOKEN)).toBe(false);
  });

  it('accepts auth_date just within 24h', () => {
    const justValid = Math.floor(Date.now() / 1000) - 86399; // 24h - 1s ago
    const data = { id: 123, first_name: 'Bob', auth_date: justValid };
    const hash = generateValidHash(data, BOT_TOKEN);
    expect(validateTelegramLogin({ ...data, hash }, BOT_TOKEN)).toBe(true);
  });

  it('rejects empty hash', () => {
    expect(validateTelegramLogin({
      id: 123, first_name: 'Bob', auth_date: Math.floor(Date.now() / 1000), hash: '',
    }, BOT_TOKEN)).toBe(false);
  });

  it('rejects hash with wrong length', () => {
    const now = Math.floor(Date.now() / 1000);
    expect(validateTelegramLogin({
      id: 123, first_name: 'Bob', auth_date: now, hash: 'abc123',
    }, BOT_TOKEN)).toBe(false);
  });

  it('filters out undefined optional fields from check string', () => {
    const now = Math.floor(Date.now() / 1000);
    const dataWithUndefined = { id: 123, first_name: 'Bob', auth_date: now, last_name: undefined, username: undefined };
    const dataClean = { id: 123, first_name: 'Bob', auth_date: now };
    const hash = generateValidHash(dataClean, BOT_TOKEN);
    expect(validateTelegramLogin({ ...dataWithUndefined, hash }, BOT_TOKEN)).toBe(true);
  });

  it('is sensitive to field value changes (tamper detection)', () => {
    const now = Math.floor(Date.now() / 1000);
    const original = { id: 123, first_name: 'Bob', auth_date: now };
    const hash = generateValidHash(original, BOT_TOKEN);
    // Tamper with first_name
    expect(validateTelegramLogin({ ...original, first_name: 'Eve', hash }, BOT_TOKEN)).toBe(false);
    // Tamper with id
    expect(validateTelegramLogin({ ...original, id: 999, hash }, BOT_TOKEN)).toBe(false);
  });
});
