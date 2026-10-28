// Minimal Qdrant REST client (vector database). Uses fetch, no extra package.
// Docs: https://api.qdrant.tech/
import { EMBEDDING_DIM } from './embeddings.js';

const BASE = (process.env.QDRANT_URL || 'http://127.0.0.1:6333').replace(/\/$/, '');
export const COLLECTION = process.env.QDRANT_COLLECTION || 'paper_embeddings';

export class VectorDbError extends Error {}

async function qdrant(method, path, body) {
  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.QDRANT_API_KEY ? { 'api-key': process.env.QDRANT_API_KEY } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      cache: 'no-store',
    });
  } catch {
    throw new VectorDbError(`Cannot reach Qdrant at ${BASE}. Is it running?`);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new VectorDbError(data?.status?.error || `Qdrant returned HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return data.result;
}

export async function collectionInfo() {
  try {
    return await qdrant('GET', `/collections/${COLLECTION}`);
  } catch (err) {
    if (err.status === 404) return null;
    throw err;
  }
}

/** Create the collection once: 384-dim vectors compared with cosine similarity. */
export async function ensureCollection() {
  if (await collectionInfo()) return;
  await qdrant('PUT', `/collections/${COLLECTION}`, {
    vectors: { size: EMBEDDING_DIM, distance: 'Cosine' },
  });
  // Payload index so year filters stay fast as the collection grows
  await qdrant('PUT', `/collections/${COLLECTION}/index?wait=true`, {
    field_name: 'publication_year',
    field_schema: 'integer',
  });
}

export async function recreateCollection() {
  await qdrant('DELETE', `/collections/${COLLECTION}`).catch(() => {});
  await ensureCollection();
}

/** points: [{ id: paper_id, vector: number[384], payload: {...} }] */
export async function upsertPoints(points) {
  if (!points.length) return;
  await qdrant('PUT', `/collections/${COLLECTION}/points?wait=true`, { points });
}

export async function deletePoints(ids) {
  await qdrant('POST', `/collections/${COLLECTION}/points/delete?wait=true`, { points: ids });
}

/**
 * Nearest-neighbour query.
 *   query: a vector (number[]) OR an existing point id (finds papers similar to that paper)
 *   filter: optional Qdrant filter on the payload
 */
export async function queryPoints({ query, limit = 5, filter, excludeIds = [] }) {
  const must = filter?.must ?? [];
  const must_not = excludeIds.length ? [{ has_id: excludeIds }] : [];
  const result = await qdrant('POST', `/collections/${COLLECTION}/points/query`, {
    query,
    limit,
    with_payload: true,
    filter: must.length || must_not.length ? { must, must_not } : undefined,
  });
  return result.points; // [{ id, score, payload }]
}
