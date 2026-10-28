// MySQL connection pool (shared by every API route and server page).
// All SQL in this project uses "?" placeholders, so user input is always
// escaped by the driver and can never be executed as SQL (no SQL injection).
import mysql from 'mysql2/promise';

// Every connection setting comes from environment variables (.env.local),
// never from the source code.
function createPool() {
  for (const key of ['DB_HOST', 'DB_USER', 'DB_NAME']) {
    if (!process.env[key]) throw new Error(`${key} is not set - copy .env.example to .env.local`);
  }
  return mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD ?? '',
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    dateStrings: true, // return DATETIME/TIMESTAMP as plain strings
    charset: 'utf8mb4',
  });
}

// Created on first use (so a missing setting shows up as a clear error
// message, not a crash at start-up) and re-used across hot reloads.
const globalForDb = globalThis;
export function getPool() {
  if (!globalForDb.__researchlensPool) globalForDb.__researchlensPool = createPool();
  return globalForDb.__researchlensPool;
}

/** Run one statement and return its rows (or the result header for INSERT/UPDATE/DELETE). */
export async function query(sql, params = []) {
  const [rows] = await getPool().query(sql, params);
  return rows;
}

/**
 * Run several statements as ONE transaction.
 * If fn throws, everything is rolled back; otherwise it is committed.
 */
export async function withTransaction(fn) {
  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();
    const q = async (sql, params = []) => (await conn.query(sql, params))[0];
    const result = await fn(q);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}
