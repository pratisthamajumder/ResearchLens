// Quick health check for the demo:  npm run check-setup
import { getPool, query } from '../lib/db.js';
import { collectionInfo, COLLECTION } from '../lib/qdrant.js';

let ok = true;
try {
  const [v] = await query('SELECT VERSION() AS v');
  console.log(`MySQL     OK  (version ${v.v})`);
  const objects = await query(
    `SELECT 'table' AS kind, COUNT(*) AS n FROM information_schema.tables  WHERE table_schema = DATABASE() AND table_type = 'BASE TABLE'
     UNION ALL SELECT 'view',      COUNT(*) FROM information_schema.views    WHERE table_schema = DATABASE()
     UNION ALL SELECT 'trigger',   COUNT(*) FROM information_schema.triggers WHERE trigger_schema = DATABASE()
     UNION ALL SELECT 'routine',   COUNT(*) FROM information_schema.routines WHERE routine_schema = DATABASE()`
  );
  for (const o of objects) console.log(`          ${o.kind.padEnd(8)} ${o.n}`);
  const expect = { table: 14, view: 3, trigger: 6, routine: 2 };
  for (const o of objects) {
    if (Number(o.n) < expect[o.kind]) {
      ok = false;
      console.log(`  !! expected at least ${expect[o.kind]} ${o.kind}s - did you run all of sql/01-04?`);
    }
  }
  const [{ n }] = await query('SELECT COUNT(*) AS n FROM research_paper');
  console.log(`          papers   ${n}`);
} catch (err) {
  ok = false;
  console.log(`MySQL     FAILED: ${err.message}`);
}

try {
  const info = await collectionInfo();
  if (info) console.log(`Qdrant    OK  (collection "${COLLECTION}" has ${info.points_count} vectors)`);
  else console.log(`Qdrant    OK  but collection "${COLLECTION}" does not exist yet -> run: npm run index-papers`);
} catch (err) {
  ok = false;
  console.log(`Qdrant    FAILED: ${err.message}`);
}

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  ok = false;
  console.log('JWT_SECRET missing or shorter than 32 characters in .env.local');
} else {
  console.log('JWT_SECRET OK');
}

await getPool().end();
process.exitCode = ok ? 0 : 1;
