import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth.js';
import { query } from '@/lib/db.js';
import { handler, HttpError, parseId, readJson } from '@/lib/errors.js';

// PATCH /api/admin/users/:id { role: 'STUDENT' | 'ADMIN' }   (ADMIN only)
export const PATCH = handler(async (request, { params }) => {
  const admin = await requireAdmin();
  const id = parseId((await params).id);
  const { role } = await readJson(request);
  if (!['STUDENT', 'ADMIN'].includes(role)) throw new HttpError(400, 'Role must be STUDENT or ADMIN.');
  if (id === admin.user_id && role !== 'ADMIN') {
    throw new HttpError(400, 'You cannot remove your own admin role.');
  }
  const res = await query('UPDATE users SET role = ? WHERE user_id = ?', [role, id]);
  if (res.affectedRows === 0) throw new HttpError(404, 'User not found.');
  return NextResponse.json({ ok: true });
});
