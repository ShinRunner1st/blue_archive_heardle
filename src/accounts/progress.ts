import { Db } from "./store";

/**
 * The progress in the account (docs/accounts.md, step 3): the whole save,
 * gzipped by the page, one row an account. The Worker never opens it,
 * which keeps every request far inside the free plan's 10 ms of CPU; it
 * checks only its size, its format and the revision it was built on.
 */

/** The biggest save taken: D1's rows hold 2 MB; the developer's is 66 KB. */
export const MAX_PROGRESS_BYTES = 1024 * 1024;

export interface ProgressMeta {
  format: number;
  revision: number;
}

/** Which progress the account has, without the save itself. */
export async function progressMeta(
  db: Db,
  account: string
): Promise<ProgressMeta | null> {
  return db
    .prepare("SELECT format, revision FROM progress WHERE account_id = ?")
    .bind(account)
    .first<ProgressMeta>();
}

/** The account's progress, as the page sent it; null if it has none. */
export async function readProgress(
  db: Db,
  account: string
): Promise<(ProgressMeta & { data: Uint8Array<ArrayBuffer> }) | null> {
  const row = await db
    .prepare("SELECT format, revision, data FROM progress WHERE account_id = ?")
    .bind(account)
    .first<ProgressMeta & { data: ArrayBuffer | Uint8Array }>();
  if (!row) return null;
  return {
    format: row.format,
    revision: row.revision,
    // A copy, whichever D1 (or the tests' SQLite) handed back.
    data: new Uint8Array(row.data),
  };
}

export type WriteResult =
  | { ok: true; revision: number }
  | { ok: false; why: "conflict"; current: ProgressMeta | null }
  | { ok: false; why: "format"; current: ProgressMeta };

/** How many rows a write changed, from D1's answer (or the tests'). */
const changesOf = (result: unknown) =>
  Number(
    (result as { meta?: { changes?: number } } | null)?.meta?.changes ?? 0
  );

/**
 * Writes the progress if the account's is still the revision the page
 * built on (0 for none yet); otherwise says which it is now, for the page
 * to merge and try again. Never over a newer format. With `backup`, the
 * progress being written over is copied to progress_backups first, in the
 * same transaction: the page asks for that when it writes a merge.
 */
export async function writeProgress(
  db: Db,
  account: string,
  write: {
    base: number;
    format: number;
    data: Uint8Array;
    backup: boolean;
  },
  now: number
): Promise<WriteResult> {
  const current = await progressMeta(db, account);
  if (current && write.format < current.format) {
    return { ok: false, why: "format", current };
  }
  if ((current?.revision ?? 0) !== write.base) {
    return { ok: false, why: "conflict", current };
  }

  const revision = write.base + 1;
  const statements = [];
  if (write.backup && current) {
    statements.push(
      db
        .prepare(
          `INSERT OR REPLACE INTO progress_backups
             (account_id, format, revision, data, saved_at)
           SELECT account_id, format, revision, data, ?
           FROM progress WHERE account_id = ? AND revision = ?`
        )
        .bind(now, account, write.base)
    );
  }
  // The revision is checked again in the write itself: of two pages
  // writing on the same revision at once, only one gets it.
  statements.push(
    current
      ? db
          .prepare(
            `UPDATE progress SET format = ?, revision = ?, data = ?, updated_at = ?
             WHERE account_id = ? AND revision = ?`
          )
          .bind(write.format, revision, write.data, now, account, write.base)
      : db
          .prepare(
            `INSERT INTO progress (account_id, format, revision, data, updated_at)
             VALUES (?, ?, ?, ?, ?) ON CONFLICT (account_id) DO NOTHING`
          )
          .bind(account, write.format, revision, write.data, now)
  );
  const results = await db.batch(statements);
  if (changesOf(results[results.length - 1]) !== 1) {
    return {
      ok: false,
      why: "conflict",
      current: await progressMeta(db, account),
    };
  }
  return { ok: true, revision };
}
