import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth.js';
import { handler } from '@/lib/errors.js';
import { getMeta } from '@/lib/papers.js';

// GET /api/meta -> domains, topics, authors, year range (for forms and filters)
export const GET = handler(async () => {
  await requireUser();
  return NextResponse.json(await getMeta());
});
