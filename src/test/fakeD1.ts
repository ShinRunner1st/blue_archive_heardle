import { DatabaseSync } from "node:sqlite";

import { Db, Statement } from "../accounts/store";

/**
 * The accounts database for tests: SQLite in memory (Node's own, the engine
 * D1 runs), with every migration in accounts-worker/migrations/ applied in
 * order, so the tests run the real tables, keys and checks.
 */
const MIGRATIONS = import.meta.glob<string>(
  "../../accounts-worker/migrations/*.sql",
  { query: "?raw", import: "default", eager: true }
);

export interface FakeD1 extends Db {
  /** The SQLite underneath, for a test to look at what was written. */
  sqlite: DatabaseSync;
}

/** A write's answer as D1 gives it: how many rows it changed. */
const d1Result = ({ changes }: { changes: number | bigint }) => ({
  meta: { changes: Number(changes) },
});

interface FakeStatement extends Statement {
  runNow(): unknown;
}

export function fakeD1(): FakeD1 {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec("PRAGMA foreign_keys = ON");
  for (const name of Object.keys(MIGRATIONS).sort()) {
    sqlite.exec(MIGRATIONS[name]);
  }

  const statement = (sql: string, values: unknown[] = []): FakeStatement => ({
    bind: (...next: unknown[]) => statement(sql, next),
    first: async <T>() =>
      (sqlite.prepare(sql).get(...values) as T | undefined) ?? null,
    all: async <T>() => ({
      results: sqlite.prepare(sql).all(...values) as T[],
    }),
    run: async () => d1Result(sqlite.prepare(sql).run(...values)),
    runNow: () => d1Result(sqlite.prepare(sql).run(...values)),
  });

  return {
    sqlite,
    prepare: (sql) => statement(sql),
    // D1 runs a batch as one transaction: all of it, or none.
    batch: async (statements) => {
      sqlite.exec("BEGIN");
      try {
        const results = statements.map((each) =>
          (each as FakeStatement).runNow()
        );
        sqlite.exec("COMMIT");
        return results;
      } catch (error) {
        sqlite.exec("ROLLBACK");
        throw error;
      }
    },
  };
}
