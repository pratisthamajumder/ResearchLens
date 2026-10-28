import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth.js';
import { handler, HttpError } from '@/lib/errors.js';
import { VectorDbError } from '@/lib/qdrant.js';
import { reindexAll } from '@/lib/vector.js';

// POST /api/semantic/reindex  (ADMIN) - rebuild every embedding from MySQL
export const POST = handler(async () => {
  await requireAdmin();
  try {
    const indexed = await reindexAll();
    return NextResponse.json({ indexed });
  } catch (err) {
    if (err instanceof VectorDbError) throw new HttpError(503, err.message);
    throw err;
  }
});
