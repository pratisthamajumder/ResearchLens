import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth.js';
import { query } from '@/lib/db.js';
import { handler, HttpError, parseId } from '@/lib/errors.js';

// DELETE /api/saved-searches/:id  - users can only delete THEIR OWN saved searches
export const DELETE = handler(async (request, { params }) => {
  const user = await requireUser();
  const id = parseId((await params).id);
  const res = await query('DELETE FROM saved_search WHERE search_id = ? AND user_id = ?', [id, user.user_id]);
  if (res.affectedRows === 0) throw new HttpError(404, 'Saved search not found.');
  return NextResponse.json({ ok: true });
});
