import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth.js';
import { handler } from '@/lib/errors.js';
import { recordSearch, searchPapers } from '@/lib/papers.js';
import { toStoredQuery } from '@/lib/searchQuery.js';
import { validateSearch } from '@/lib/validate.js';

// GET /api/search?q=&type=keyword|title|author&domain=&topic=&yearFrom=&yearTo=
// Runs the search in MySQL and records it in search_history.
export const GET = handler(async (request) => {
  const user = await requireUser();
  const search = validateSearch(new URL(request.url).searchParams);
  const results = await searchPapers(search);

  const searchType = search.q ? search.type : 'filter';
  await recordSearch(user.user_id, toStoredQuery(search), searchType, results.length);

  return NextResponse.json({ results, count: results.length, searchType });
});
