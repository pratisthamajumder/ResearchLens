// Build the Qdrant vector index from the papers in MySQL.
//   npm run index-papers
// Re-runnable: it drops and recreates the collection each time.
import { getPool } from '../lib/db.js';
import { reindexAll, vectorStatus, semanticSearch } from '../lib/vector.js';

try {
  console.log('Embedding papers with all-MiniLM-L6-v2 (the first run downloads the model, ~23 MB)...');
  const t0 = Date.now();
  const n = await reindexAll();
  console.log(`Indexed ${n} papers in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  console.log(await vectorStatus());

  const demo = 'searching millions of embeddings quickly';
  console.log(`\nDemo query: "${demo}"`);
  for (const hit of await semanticSearch(demo, { limit: 3 })) {
    console.log(`  ${hit.score.toFixed(3)}  #${hit.id}  ${hit.payload.title}`);
  }
} catch (err) {
  console.error('Indexing failed:', err.message);
  process.exitCode = 1;
} finally {
  await getPool().end();
}
