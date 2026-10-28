import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import { query } from '@/lib/db.js';
import { handler, HttpError, readJson } from '@/lib/errors.js';
import { validateLogin } from '@/lib/validate.js';
import { createToken, SESSION_COOKIE, sessionCookieOptions } from '@/lib/token.js';

// POST /api/auth/login  { email, password }
export const POST = handler(async (request) => {
  const { email, password } = validateLogin(await readJson(request));
  const rows = await query(
    'SELECT user_id, name, email, role, password_hash FROM users WHERE email = ?',
    [email]
  );
  const user = rows[0];
  // Same message for "no such user" and "wrong password" so attackers
  // cannot discover which emails are registered.
  const ok = user ? await bcrypt.compare(password, user.password_hash) : false;
  if (!ok) throw new HttpError(401, 'Invalid email or password.');

  const { password_hash, ...safeUser } = user;
  const response = NextResponse.json({ user: safeUser });
  response.cookies.set(SESSION_COOKIE, await createToken(safeUser), sessionCookieOptions());
  return response;
});
