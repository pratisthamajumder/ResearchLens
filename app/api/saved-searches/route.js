import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth.js';
import { query } from '@/lib/db.js';
import { handler, HttpError, readJson } from '@/lib/errors.js';

const TYPES = ['keyword', 'title', 'author', 'filter', 'semantic'];

// GET /api/saved-searches -> the current user's saved searches
export const GET = handler(async () => {
  const user = await requireUser();
  const saved = await query(
    `SELECT search_id, query, search_type, created_at
       FROM saved_search WHERE user_id = ? ORDER BY created_at DESC, search_id DESC`,
    [user.user_id]
  );
  return NextResponse.json({ saved });
});

// POST /api/saved-searches { query, search_type }
export const POST = handler(async (request) => {
  const user = await requireUser();
  const body = await readJson(request);
  const text = typeof body.query === 'string' ? body.query.trim() : '';
  const type = TYPES.includes(body.search_type) ? body.search_type : null;
  if (!text || text.length > 500) throw new HttpError(400, 'Nothing to save.');
  if (!type) throw new HttpError(400, 'Invalid search type.');

  const dup = await query(
    'SELECT search_id FROM saved_search WHERE user_id = ? AND query = ? AND search_type = ?',
    [user.user_id, text, type]
  );
  if (dup.length) return NextResponse.json({ search_id: dup[0].search_id, alreadySaved: true });

  const res = await query(
    'INSERT INTO saved_search (user_id, query, search_type) VALUES (?, ?, ?)',
    [user.user_id, text, type]
  );
  return NextResponse.json({ search_id: res.insertId }, { status: 201 });
});
