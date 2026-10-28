import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth.js';
import { handler, HttpError, parseId } from '@/lib/errors.js';
import { getPapersByIds } from '@/lib/papers.js';
import { VectorDbError } from '@/lib/qdrant.js';
import { similarPapers } from '@/lib/vector.js';

// GET /api/semantic/similar/:id -> papers closest in meaning to paper :id
export const GET = handler(async (request, { params }) => {
  await requireUser();
  const id = parseId((await params).id);
  let hits;
  try {
    hits = await similarPapers(id, 5);
  } catch (err) {
    if (err instanceof VectorDbError) {
      const msg = err.status === 404
        ? 'This paper is not in the vector index yet. An admin can rebuild the index on the Admin page.'
        : err.message;
      throw new HttpError(503, msg);
    }
    throw err;
  }
  const rows = await getPapersByIds(hits.map((h) => Number(h.id)));
  const byId = new Map(rows.map((r) => [r.paper_id, r]));
  const results = hits
    .map((h) => ({ ...byId.get(Number(h.id)), score: h.score }))
    .filter((r) => r.paper_id);
  return NextResponse.json({ results });
});
