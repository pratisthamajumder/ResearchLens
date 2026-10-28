import { NextResponse } from 'next/server';
import { requireAdmin, requireUser } from '@/lib/auth.js';
import { handler, readJson } from '@/lib/errors.js';
import { createPaper, listPapers } from '@/lib/papers.js';
import { validatePaper } from '@/lib/validate.js';
import { indexPaper } from '@/lib/vector.js';

// GET /api/papers  -> all papers (any logged-in user)
export const GET = handler(async () => {
  await requireUser();
  return NextResponse.json({ papers: await listPapers() });
});

// POST /api/papers -> add a paper (ADMIN only)
export const POST = handler(async (request) => {
  await requireAdmin();
  const input = validatePaper(await readJson(request));
  const paperId = await createPaper(input);

  // Keep the vector database in sync. MySQL is the source of truth, so a
  // Qdrant problem is reported as a warning instead of failing the request.
  let warning = null;
  try {
    await indexPaper(paperId);
  } catch (err) {
    warning = `Paper saved, but it was not added to the vector index: ${err.message}`;
  }
  return NextResponse.json({ paper_id: paperId, warning }, { status: 201 });
});
