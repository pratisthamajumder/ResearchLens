// Converts a search between the URL form used by the Search page and the
// text form stored in search_history.query / saved_search.query.
//   plain keyword search, no filters  ->  "transformer"
//   with filters                       ->  "q=transformer&yearFrom=2018&domain=1"
// Rows stored as plain text (like the sample data) still work.

const KEYS = ['q', 'domain', 'topic', 'yearFrom', 'yearTo'];

export function toStoredQuery(search) {
  const hasFilter = ['domain', 'topic', 'yearFrom', 'yearTo'].some((k) => search[k] != null && search[k] !== '');
  if (!hasFilter) return search.q || '';
  const sp = new URLSearchParams();
  for (const k of KEYS) if (search[k] != null && search[k] !== '') sp.set(k, String(search[k]));
  return sp.toString();
}

/** Build the page URL that re-runs a stored search. */
export function rerunUrl(storedQuery, searchType) {
  if (searchType === 'semantic') return `/semantic?q=${encodeURIComponent(storedQuery)}`;
  const sp = storedQuery.includes('=') ? new URLSearchParams(storedQuery) : new URLSearchParams({ q: storedQuery });
  if (['keyword', 'title', 'author'].includes(searchType)) sp.set('type', searchType);
  sp.set('run', '1');
  return `/search?${sp.toString()}`;
}

/** Human-friendly label for a stored query. */
export function describeQuery(storedQuery) {
  if (!storedQuery.includes('=')) return storedQuery;
  const sp = new URLSearchParams(storedQuery);
  const parts = [];
  if (sp.get('q')) parts.push(`"${sp.get('q')}"`);
  if (sp.get('domain')) parts.push(`domain #${sp.get('domain')}`);
  if (sp.get('topic')) parts.push(`topic #${sp.get('topic')}`);
  if (sp.get('yearFrom') || sp.get('yearTo')) parts.push(`years ${sp.get('yearFrom') || '…'}–${sp.get('yearTo') || '…'}`);
  return parts.join(', ');
}
