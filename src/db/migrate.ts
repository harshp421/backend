import { readdir, readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from './pool.js';

const MIGRATIONS_DIR = join(dirname(fileURLToPath(import.meta.url)), 'migrations');

const SECTION_RE = /^--\s*UP\s*$([\s\S]*?)^--\s*DOWN\s*$([\s\S]*)$/m;

interface Section {
  up: string;
  down: string;
}

function splitSections(content: string): Section {
  const match = content.match(SECTION_RE);
  if (!match || !match[1] || !match[2]) {
    throw new Error('Migration must contain "-- UP" and "-- DOWN" sections');
  }
  return { up: match[1].trim(), down: match[2].trim() };
}

async function ensureTable(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id         text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);
}

async function appliedIds(): Promise<Set<string>> {
  const { rows } = await pool.query<{ id: string }>('SELECT id FROM schema_migrations');
  return new Set(rows.map((r) => r.id));
}

async function listMigrationFiles(): Promise<string[]> {
  const files = await readdir(MIGRATIONS_DIR);
  return files.filter((f) => f.endsWith('.sql')).sort();
}

export async function up(): Promise<void> {
  await ensureTable();
  const done = await appliedIds();
  const files = await listMigrationFiles();

  let applied = 0;
  for (const file of files) {
    const id = file.replace(/\.sql$/, '');
    if (done.has(id)) continue;

    const { up: upSql } = splitSections(await readFile(join(MIGRATIONS_DIR, file), 'utf8'));
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(upSql);
      await client.query('INSERT INTO schema_migrations (id) VALUES ($1)', [id]);
      await client.query('COMMIT');
      console.log(`[migrate] applied ${id}`);
      applied++;
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(`[migrate] FAILED ${id}`);
      throw err;
    } finally {
      client.release();
    }
  }

  if (applied === 0) console.log('[migrate] nothing to apply');
}

export async function down(): Promise<void> {
  await ensureTable();
  const { rows } = await pool.query<{ id: string }>(
    'SELECT id FROM schema_migrations ORDER BY id DESC LIMIT 1',
  );
  const last = rows[0];
  if (!last) {
    console.log('[migrate] nothing to roll back');
    return;
  }

  const { down: downSql } = splitSections(
    await readFile(join(MIGRATIONS_DIR, `${last.id}.sql`), 'utf8'),
  );

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(downSql);
    await client.query('DELETE FROM schema_migrations WHERE id = $1', [last.id]);
    await client.query('COMMIT');
    console.log(`[migrate] rolled back ${last.id}`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(`[migrate] FAILED rollback ${last.id}`);
    throw err;
  } finally {
    client.release();
  }
}

const cmd = process.argv[2];
const run = cmd === 'up' ? up : cmd === 'down' ? down : null;

if (!run) {
  console.error('Usage: tsx src/db/migrate.ts <up|down>');
  process.exit(1);
}

run()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
