// Text -> vector embeddings, computed locally with the open-source
// sentence-transformers model all-MiniLM-L6-v2 (ONNX build, via transformers.js).
//   * 384-dimensional vectors
//   * mean pooling over tokens + L2 normalisation, so cosine similarity
//     between two vectors = how close their meanings are
// The model (~23 MB) is downloaded once on first use and cached on disk.
// No API key or paid service is needed.

export const EMBEDDING_DIM = 384;
const MODEL = process.env.EMBEDDING_MODEL || 'Xenova/all-MiniLM-L6-v2';

const globalForModel = globalThis;

async function getExtractor() {
  if (!globalForModel.__researchlensExtractor) {
    globalForModel.__researchlensExtractor = import('@huggingface/transformers')
      .then(({ pipeline }) => pipeline('feature-extraction', MODEL, { dtype: 'fp32' }))
      .catch((err) => {
        globalForModel.__researchlensExtractor = null; // allow a retry later
        throw err;
      });
  }
  return globalForModel.__researchlensExtractor;
}

/** Embed one string or an array of strings. Always returns an array of vectors. */
export async function embed(texts) {
  const list = Array.isArray(texts) ? texts : [texts];
  const extractor = await getExtractor();
  const output = await extractor(list, { pooling: 'mean', normalize: true });
  return output.tolist();
}

/** The text we embed for a paper: title + abstract + keywords + topics. */
export function paperToText(p) {
  return [
    p.title,
    p.abstract || '',
    p.keywords ? `Keywords: ${p.keywords}.` : '',
    p.topics ? `Topics: ${p.topics}.` : '',
  ]
    .filter(Boolean)
    .join('\n');
}
