import { NextResponse } from 'next/server';
import { requireAdmin, requireUser } from '@/lib/auth.js';
import { handler, HttpError, parseId, readJson } from '@/lib/errors.js';
import { deletePaper, getPaper, updatePaper } from '@/lib/papers.js';
import { validatePaper } from '@/lib/validate.js';
import { indexPaper, removePaper } from '@/lib/vector.js';

// GET /api/papers/:id
export const GET = handler(async (request, { params }) => {
  await requireUser();
  const paper = await getPaper(parseId((await params).id));
  if (!paper) throw new HttpError(404, 'Paper not found.');
  return NextResponse.json({ paper });
});

// PUT /api/papers/:id  (ADMIN)
export const PUT = handler(async (request, { params }) => {
  await requireAdmin();
  const id = parseId((await params).id);
  const input = validatePaper(await readJson(request));
  await updatePaper(id, input);

  let warning = null;
  try {
    await indexPaper(id);
  } catch (err) {
    warning = `Paper saved, but the vector index was not updated: ${err.message}`;
  }
  return NextResponse.json({ paper_id: id, warning });
});

// DELETE /api/papers/:id  (ADMIN)
export const DELETE = handler(async (request, { params }) => {
  await requireAdmin();
  const id = parseId((await params).id);
  await deletePaper(id);

  let warning = null;
  try {
    await removePaper(id);
  } catch (err) {
    warning = `Paper deleted, but it could not be removed from the vector index: ${err.message}`;
  }
  return NextResponse.json({ ok: true, warning });
});
