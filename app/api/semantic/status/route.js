import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth.js';
import { handler } from '@/lib/errors.js';
import { vectorStatus } from '@/lib/vector.js';

// GET /api/semantic/status -> is Qdrant up, how many papers are indexed
export const GET = handler(async () => {
  await requireUser();
  try {
    return NextResponse.json({ online: true, ...(await vectorStatus()) });
  } catch (err) {
    return NextResponse.json({ online: false, error: err.message });
  }
});
