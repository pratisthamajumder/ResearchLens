// JWT helpers. Kept free of Node-only imports so middleware.js (Edge runtime)
// can use them too.
import { SignJWT, jwtVerify } from 'jose';

export const SESSION_COOKIE = 'rl_session';
export const SESSION_MAX_AGE = 8 * 60 * 60; // 8 hours, in seconds

function secretKey() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('JWT_SECRET is missing or shorter than 32 characters (see .env.example)');
  }
  return new TextEncoder().encode(secret);
}

export async function createToken(user) {
  return new SignJWT({ name: user.name, role: user.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(String(user.user_id))
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(secretKey());
}

/** Returns the token payload, or null if the token is missing, forged or expired. */
export async function verifyToken(token) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    return payload;
  } catch {
    return null;
  }
}

export function sessionCookieOptions() {
  return {
    httpOnly: true, // not readable from browser JavaScript
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  };
}
