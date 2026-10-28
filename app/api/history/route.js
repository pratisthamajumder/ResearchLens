import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth.js';
import { query } from '@/lib/db.js';
import { handler } from '@/lib/errors.js';

// GET /api/history -> the current user's last 50 searches
export const GET = handler(async () => {
  const user = await requireUser();
  const history = await query(
    `SELECT history_id, query, search_type, searched_at, results_count
       FROM search_history WHERE user_id = ?
      ORDER BY searched_at DESC, history_id DESC LIMIT 50`,
    [user.user_id]
  );
  return NextResponse.json({ history });
});

// DELETE /api/history -> clear the current user's history
export const DELETE = handler(async () => {
  const user = await requireUser();
  const res = await query('DELETE FROM search_history WHERE user_id = ?', [user.user_id]);
  return NextResponse.json({ deleted: res.affectedRows });
});
