import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import { query } from '@/lib/db.js';
import { handler, HttpError, readJson } from '@/lib/errors.js';
import { validateRegistration } from '@/lib/validate.js';
import { createToken, SESSION_COOKIE, sessionCookieOptions } from '@/lib/token.js';

// POST /api/auth/register  { name, email, password }
// Every self-registered account is a STUDENT. Only an ADMIN can promote users.
export const POST = handler(async (request) => {
  const { name, email, password } = validateRegistration(await readJson(request));
  const password_hash = await bcrypt.hash(password, 10); // bcrypt, cost 10 (salted)

  let res;
  try {
    res = await query(
      "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'STUDENT')",
      [name, email, password_hash]
    );
  } catch (err) {
    if (err.errno === 1062) throw new HttpError(409, 'An account with this email already exists.');
    throw err;
  }
  const user = { user_id: res.insertId, name, email, role: 'STUDENT' };

  const response = NextResponse.json({ user }, { status: 201 });
  response.cookies.set(SESSION_COOKIE, await createToken(user), sessionCookieOptions());
  return response;
});
