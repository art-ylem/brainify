import { describe, it, expect, beforeAll } from 'vitest';
import { SignJWT, jwtVerify } from 'jose';

// Replicate the JWT module logic to test without importing DB/Redis deps
const TEST_SECRET = 'a_test_secret_that_is_at_least_32_chars_long!!';

function getSecret(): Uint8Array {
  return new TextEncoder().encode(TEST_SECRET);
}

async function signJwt(payload: { telegramId: number }, expiry = '1h'): Promise<string> {
  return new SignJWT({ sub: String(payload.telegramId) })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiry)
    .sign(getSecret());
}

async function verifyJwt(token: string): Promise<{ sub?: string; iat?: number } | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      algorithms: ['HS256'],
    });
    return payload as { sub?: string; iat?: number };
  } catch {
    return null;
  }
}

describe('JWT sign/verify', () => {
  it('signs and verifies a valid token', async () => {
    const token = await signJwt({ telegramId: 123456 });
    expect(typeof token).toBe('string');
    expect(token.split('.').length).toBe(3);

    const payload = await verifyJwt(token);
    expect(payload).not.toBeNull();
    expect(payload!.sub).toBe('123456');
  });

  it('stores telegramId as string in sub claim', async () => {
    const token = await signJwt({ telegramId: 987654321 });
    const payload = await verifyJwt(token);
    expect(payload!.sub).toBe('987654321');
    expect(typeof payload!.sub).toBe('string');
  });

  it('sets iat claim', async () => {
    const before = Math.floor(Date.now() / 1000);
    const token = await signJwt({ telegramId: 1 });
    const payload = await verifyJwt(token);
    expect(payload!.iat).toBeGreaterThanOrEqual(before);
    expect(payload!.iat).toBeLessThanOrEqual(Math.floor(Date.now() / 1000) + 1);
  });

  it('rejects tampered token', async () => {
    const token = await signJwt({ telegramId: 123 });
    // Tamper with the payload part
    const parts = token.split('.');
    parts[1] = parts[1] + 'X';
    const tampered = parts.join('.');
    const result = await verifyJwt(tampered);
    expect(result).toBeNull();
  });

  it('rejects token signed with different secret', async () => {
    const otherSecret = new TextEncoder().encode('another_secret_that_is_at_least_32_chars!!');
    const token = await new SignJWT({ sub: '123' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(otherSecret);

    const result = await verifyJwt(token);
    expect(result).toBeNull();
  });

  it('rejects expired token', async () => {
    // Sign with 1 second expiry
    const token = await signJwt({ telegramId: 123 }, '1s');
    // Wait 2 seconds
    await new Promise(r => setTimeout(r, 2000));
    const result = await verifyJwt(token);
    expect(result).toBeNull();
  }, 5000);

  it('rejects completely invalid string', async () => {
    expect(await verifyJwt('not-a-jwt')).toBeNull();
    expect(await verifyJwt('')).toBeNull();
    expect(await verifyJwt('abc.def.ghi')).toBeNull();
  });

  it('handles large telegramId correctly', async () => {
    const largeTgId = 9999999999; // 10 digits, fits in JS number
    const token = await signJwt({ telegramId: largeTgId });
    const payload = await verifyJwt(token);
    expect(payload!.sub).toBe('9999999999');
    expect(Number(payload!.sub)).toBe(largeTgId);
  });
});
