import pg from 'pg';
import { env } from '../config/env.js';

// Managed Postgres (Neon, Supabase, etc.) requires TLS. node-postgres doesn't
// always honor `sslmode=require` from the URL, so enable it explicitly when the
// URL asks for it or we're in production.
const needsSsl =
  /sslmode=require/i.test(env.DATABASE_URL) || env.NODE_ENV === 'production';

export const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
  // Keep the pool small on serverless: every cold start makes its own pool, and
  // the platform fans out across many short-lived instances. A Neon *pooler*
  // connection string handles the real fan-in.
  max: env.NODE_ENV === 'production' ? 3 : 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
  ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
});

pool.on('error', (err) => {
  // Idle-client errors are non-fatal; the pool replaces the connection.
  console.error('[pg] idle client error', err);
});
