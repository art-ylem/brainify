import { SignJWT, jwtVerify, type JWTPayload } from 'jose';

export interface JwtTokenPayload extends JWTPayload {
  sub: string; // telegramId as string
}

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('JWT_SECRET must be set and at least 32 characters');
  }
  return new TextEncoder().encode(secret);
}

export async function signJwt(payload: { telegramId: number }): Promise<string> {
  const expiry = process.env.JWT_EXPIRY ?? '1h';
  return new SignJWT({ sub: String(payload.telegramId) })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiry)
    .sign(getSecret());
}

export async function verifyJwt(token: string): Promise<JwtTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      algorithms: ['HS256'],
    });
    return payload as JwtTokenPayload;
  } catch {
    return null;
  }
}
