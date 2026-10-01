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
}

interface Meta {
  rows_read?: number;
  rows_written?: number;
}

const add = (tally: Tally, result: unknown) => {
  const meta = (result as { meta?: Meta } | null)?.meta;
  tally.read += meta?.rows_read ?? 0;
  tally.written += meta?.rows_written ?? 0;
  tally.queries += 1;
};

export function measured(db: Db, tally: Tally): Db {
  const wrap = (inner: Statement): Statement => ({
    bind: (...values) => wrap(inner.bind(...values)),
    first: async <T>() => {
      const result = await inner.all<T>();
      add(tally, result);
      return result.results[0] ?? null;
    },
    all: async <T>() => {
      const result = await inner.all<T>();
      add(tally, result);
      return result;
    },
    run: async () => {
      const result = await inner.run();
      add(tally, result);
      return result;
    },
    // The real statement, for a batch.
    ...({ inner } as object),
  });
  return {
    prepare: (sql) => wrap(db.prepare(sql)),
    batch: async (statements) => {
      const results = await db.batch(
        statements.map(
          (each) => (each as unknown as { inner: Statement }).inner
        )
      );
      results.forEach((result) => add(tally, result));
      return results;
    },
  };
}
