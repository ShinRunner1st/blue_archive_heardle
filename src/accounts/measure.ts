import { Db, Statement } from "./store";

/**
 * Counting what each request costs on D1's free plan (docs/accounts.md,
 * section 6): rows read and written, summed from every query's `meta`, as
 * D1 reports them. Only for `npm run accounts:measure`, on localhost (see
 * accounts-worker/index.ts): a deployed Worker never wraps its database.
 *
 * `first()` gives no `meta`, so it's asked as `all()` here and the first
 * row handed back; the queries are the same.
 */
export interface Tally {
  read: number;
  written: number;
  queries: number;
  /** Each query: its SQL's start, and what it cost. */
  each?: { sql: string; read: number; written: number }[];
}

interface Meta {
  rows_read?: number;
  rows_written?: number;
}

const add = (tally: Tally, result: unknown, sql: string) => {
  const meta = (result as { meta?: Meta } | null)?.meta;
  const read = meta?.rows_read ?? 0;
  const written = meta?.rows_written ?? 0;
  tally.read += read;
  tally.written += written;
  tally.queries += 1;
  tally.each?.push({
    sql: sql.replace(/\s+/g, " ").trim().slice(0, 70),
    read,
    written,
  });
};

export function measured(db: Db, tally: Tally): Db {
  const wrap = (inner: Statement, sql: string): Statement => ({
    bind: (...values) => wrap(inner.bind(...values), sql),
    first: async <T>() => {
      const result = await inner.all<T>();
      add(tally, result, sql);
      return result.results[0] ?? null;
    },
    all: async <T>() => {
      const result = await inner.all<T>();
      add(tally, result, sql);
      return result;
    },
    run: async () => {
      const result = await inner.run();
      add(tally, result, sql);
      return result;
    },
    // The real statement and its SQL, for a batch.
    ...({ inner, sql } as object),
  });
  return {
    prepare: (sql) => wrap(db.prepare(sql), sql),
    batch: async (statements) => {
      const wrapped = statements as unknown as {
        inner: Statement;
        sql: string;
      }[];
      const results = await db.batch(wrapped.map(({ inner }) => inner));
      results.forEach((result, i) => add(tally, result, wrapped[i].sql));
      return results;
    },
  };
}
