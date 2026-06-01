import { z, type ZodTypeAny } from 'zod';
import type { PoolClient, QueryResultRow } from 'pg';
import { pool } from './pool.js';
import { NotFoundError } from '../errors/AppError.js';

type Runner = Pick<PoolClient, 'query'>;

export async function queryRows<T extends ZodTypeAny>(
  schema: T,
  sql: string,
  params: readonly unknown[] = [],
  runner: Runner = pool,
): Promise<z.infer<T>[]> {
  const result = await runner.query<QueryResultRow>(sql, params as unknown[]);
  return z.array(schema).parse(result.rows);
}

export async function queryOne<T extends ZodTypeAny>(
  schema: T,
  sql: string,
  params: readonly unknown[] = [],
  runner: Runner = pool,
): Promise<z.infer<T>> {
  const rows = await queryRows(schema, sql, params, runner);
  const first = rows[0];
  if (first === undefined) throw new NotFoundError('Row not found');
  return first;
}

export async function queryMaybeOne<T extends ZodTypeAny>(
  schema: T,
  sql: string,
  params: readonly unknown[] = [],
  runner: Runner = pool,
): Promise<z.infer<T> | null> {
  const rows = await queryRows(schema, sql, params, runner);
  return rows[0] ?? null;
}

export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
