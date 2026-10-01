// @vitest-environment node
import { describe, expect, it } from "vitest";

import { measured, Tally } from "./measure";
import { Db, Statement } from "./store";

/** A database that answers every query with one row and a cost. */
function stub(): Db {
  const statement = (sql: string): Statement => ({
    bind: () => statement(sql),
    first: async () => {
      throw new Error("measured() asks all() instead, for the meta");
    },
    all: async <T>() =>
      ({
        results: [{ sql }] as T[],
        meta: { rows_read: 3, rows_written: 0 },
      } as { results: T[] }),
    run: async () => ({ meta: { rows_read: 1, rows_written: 2 } }),
  });
  return {
    prepare: statement,
    batch: async (statements) =>
      statements.map(() => ({ meta: { rows_read: 1, rows_written: 1 } })),
  };
}

describe("measured", () => {
  it("adds up what each query cost, and answers as the database does", async () => {
    const tally: Tally = { read: 0, written: 0, queries: 0 };
    const db = measured(stub(), tally);
    expect(await db.prepare("SELECT 1").bind(1).first()).toEqual({
      sql: "SELECT 1",
    });
    await db.prepare("UPDATE x").run();
    await db.batch([db.prepare("A"), db.prepare("B")]);
    expect(tally).toEqual({ read: 3 + 1 + 2, written: 2 + 2, queries: 4 });
  });
});
