// Server-side session + role checks.
// The role is ALWAYS re-read from MySQL on every request, so if an admin
// changes someone's role (or deletes the user) it takes effect immediately,
// even though the old JWT is still in their browser.
import { cookies } from 'next/headers';
import { query } from './db.js';
import { SESSION_COOKIE, verifyToken } from './token.js';
import { HttpError } from './errors.js';

export async function getSessionUser() {
  const store = await cookies();
  const payload = await verifyToken(store.get(SESSION_COOKIE)?.value);
  if (!payload?.sub) return null;
  const rows = await query(
    'SELECT user_id, name, email, role, created_at FROM users WHERE user_id = ?',
    [Number(payload.sub)]
  );
  return rows[0] ?? null;
}

export async function requireUser() {
  const user = await getSessionUser();
  if (!user) throw new HttpError(401, 'Please log in first.');
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== 'ADMIN') throw new HttpError(403, 'Only ADMIN users can do this.');
  return user;
}
