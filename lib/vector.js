// Semantic layer: keeps Qdrant in sync with MySQL and answers similarity queries.
//
//   MySQL  = source of truth for every paper (relational data, constraints)
//   Qdrant = one point per paper: id = paper_id, vector = embedding of
//            title + abstract + keywords + topics, payload = small metadata
//            copy (title, year, journal, topics) used for filtering/display.
import { query } from './db.js';
import { embed, paperToText } from './embeddings.js';
import {
  collectionInfo,
  deletePoints,
  ensureCollection,
  queryPoints,
  recreateCollection,
  upsertPoints,
} from './qdrant.js';

const BATCH = 16;

async function loadPapers(ids) {
  const where = ids ? 'WHERE paper_id IN (?)' : '';
  return query(
    `SELECT paper_id, title, abstract, publication_year, journal, topics, keywords, domains
       FROM v_paper_details ${where}`,
    ids ? [ids] : []
  );
}

function toPoint(paper, vector) {
  return {
    id: paper.paper_id,
    vector,
    payload: {
      paper_id: paper.paper_id,
      title: paper.title,
      publication_year: paper.publication_year,
      journal: paper.journal,
      topics: paper.topics ? paper.topics.split(', ') : [],
      domains: paper.domains ? paper.domains.split(', ') : [],
    },
  };
}

async function indexRows(rows) {
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    const vectors = await embed(chunk.map(paperToText));
    await upsertPoints(chunk.map((p, j) => toPoint(p, vectors[j])));
  }
  return rows.length;
}

/** (Re)index one paper after it is created or edited. */
export async function indexPaper(paperId) {
  await ensureCollection();
  return indexRows(await loadPapers([paperId]));
}

export async function removePaper(paperId) {
  if (await collectionInfo()) await deletePoints([paperId]);
}

/** Rebuild the whole collection from MySQL. */
export async function reindexAll() {
  await recreateCollection();
  return indexRows(await loadPapers(null));
}

function yearFilter(yearFrom, yearTo) {
  if (!yearFrom && !yearTo) return undefined;
  const range = {};
  if (yearFrom) range.gte = yearFrom;
  if (yearTo) range.lte = yearTo;
  return { must: [{ key: 'publication_year', range }] };
}

/** Free-text meaning-based search ("papers about finding similar vectors fast"). */
export async function semanticSearch(text, { limit = 8, yearFrom, yearTo } = {}) {
  const [vector] = await embed(text);
  return queryPoints({ query: vector, limit, filter: yearFilter(yearFrom, yearTo) });
}

/** Papers whose embeddings are closest to this paper's embedding. */
export async function similarPapers(paperId, limit = 5) {
  return queryPoints({ query: paperId, limit, excludeIds: [paperId] });
}

export async function vectorStatus() {
  const info = await collectionInfo();
  const [{ total }] = await query('SELECT COUNT(*) AS total FROM research_paper');
  return {
    collectionExists: Boolean(info),
    indexedPoints: info?.points_count ?? 0,
    papersInMySQL: total,
    vectorSize: info?.config?.params?.vectors?.size ?? null,
    distance: info?.config?.params?.vectors?.distance ?? null,
  };
}
