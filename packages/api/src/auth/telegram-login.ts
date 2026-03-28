import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

export interface TelegramLoginData {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

/**
 * Validate data received from Telegram Login Widget.
 * Algorithm: SHA256(botToken) → HMAC-SHA256(data-check-string) → compare hash.
 * See: https://core.telegram.org/widgets/login#checking-authorization
 */
export function validateTelegramLogin(data: TelegramLoginData, botToken: string): boolean {
  const { hash, ...rest } = data;
  if (!hash) return false;

  // Build data-check-string: sorted key=value pairs joined by \n
  const checkString = Object.entries(rest)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `${k}=${v}`)
    .sort()
    .join('\n');

  const secretKey = createHash('sha256').update(botToken).digest();
  const computedHash = createHmac('sha256', secretKey).update(checkString).digest();

  const hashBuffer = Buffer.from(hash, 'hex');
  if (hashBuffer.length !== computedHash.length) return false;

  if (!timingSafeEqual(computedHash, hashBuffer)) return false;

  // Check auth_date is not older than 24 hours
  const maxAge = 86400;
  if (Date.now() / 1000 - data.auth_date > maxAge) return false;

  return true;
}
