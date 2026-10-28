import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth.js';
import { handler, HttpError, readJson } from '@/lib/errors.js';
import { getPapersByIds, recordSearch } from '@/lib/papers.js';
import { VectorDbError } from '@/lib/qdrant.js';
import { semanticSearch } from '@/lib/vector.js';

// POST /api/semantic/search { query, limit?, yearFrom?, yearTo? }
// 1. embed the query text  2. nearest-neighbour search in Qdrant (cosine)
// 3. join the hits back to MySQL for authors/topics  4. log to search_history
export const POST = handler(async (request) => {
  const user = await requireUser();
  const body = await readJson(request);
  const text = typeof body.query === 'string' ? body.query.trim().slice(0, 500) : '';
  if (text.length < 3) throw new HttpError(400, 'Describe what you are looking for (3+ characters).');
  const limit = Math.min(Math.max(Number(body.limit) || 8, 1), 20);
  const yearFrom = Number(body.yearFrom) || undefined;
  const yearTo = Number(body.yearTo) || undefined;

  let hits;
  try {
    hits = await semanticSearch(text, { limit, yearFrom, yearTo });
  } catch (err) {
    if (err instanceof VectorDbError) throw new HttpError(503, err.message);
    throw err;
  }

  const rows = await getPapersByIds(hits.map((h) => Number(h.id)));
  const byId = new Map(rows.map((r) => [r.paper_id, r]));
  const results = hits
    .map((h) => ({ ...byId.get(Number(h.id)), score: h.score }))
    .filter((r) => r.paper_id); // skip vectors whose paper was deleted in MySQL

  await recordSearch(user.user_id, text, 'semantic', results.length);
  return NextResponse.json({ results, count: results.length });
});
