import { ACCOUNT_UNUSED_DAYS } from "../types/account";
import { Db, dayOf } from "./store";

/**
 * Deleting and downloading an account, and deleting the ones unused for
 * two years (docs/accounts.md, section 8; the policy is /privacy).
 */

/**
 * Every table holding an account's rows, the account last. Each already
 * goes with the account (ON DELETE CASCADE, which D1 enforces), but each
 * is named too, so a deletion never rests on that alone.
 */
const ACCOUNT_TABLES = [
  "verified_room",
  "verified_summary",
  "verified_daily",
  "verified_clock",
  "missions_cleared",
  "progress_backups",
  "progress",
  "profiles",
  "sign_in_codes",
  "sessions",
  "identities",
] as const;

/**
 * Deletes accounts and everything kept for them, in one batch: all of it
 * or, if anything fails, none. D1's Time Travel keeps its history for up
 * to 7 days after (the policy says so); then it's gone.
 */
export async function deleteAccounts(db: Db, accounts: string[]) {
  if (accounts.length === 0) return;
  const marks = accounts.map(() => "?").join(", ");
  await db.batch([
    ...ACCOUNT_TABLES.map((table) =>
      db
        .prepare(`DELETE FROM ${table} WHERE account_id IN (${marks})`)
        .bind(...accounts)
    ),
    db.prepare(`DELETE FROM accounts WHERE id IN (${marks})`).bind(...accounts),
  ]);
}

/** Accounts deleted in one batch by the daily run, a few at a time. */
const BATCH = 50;
/** The most batches one daily run deletes; the rest wait for the next. */
const MAX_BATCHES = 20;

/**
 * The daily run (accounts-worker's cron): deletes the accounts nobody has
 * signed in with or synced for ACCOUNT_UNUSED_DAYS (`seen_day`, marked at
 * most once a day by any call), and the sessions and sign-in codes that
 * have run out. Reads the accounts table once a batch, with no index on
 * `seen_day`, which would cost a write each time it moves.
 */
export async function tidyAccounts(
  db: Db,
  now: number
): Promise<{ accounts: number }> {
  await db.batch([
    db.prepare("DELETE FROM sessions WHERE expires_at < ?").bind(now),
    db.prepare("DELETE FROM sign_in_codes WHERE expires_at < ?").bind(now),
  ]);
  const before = dayOf(now) - ACCOUNT_UNUSED_DAYS;
  let deleted = 0;
  for (let i = 0; i < MAX_BATCHES; i++) {
    const { results } = await db
      .prepare(`SELECT id FROM accounts WHERE seen_day < ? LIMIT ${BATCH}`)
      .bind(before)
      .all<{ id: string }>();
    await deleteAccounts(
      db,
      results.map(({ id }) => id)
    );
    deleted += results.length;
    if (results.length < BATCH) break;
  }
  return { accounts: deleted };
}

/** Bytes as base64, a chunk at a time, for the progress in a download. */
function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

const isoDay = (day: number) =>
  new Date(day * 24 * 60 * 60_000).toISOString().slice(0, 10);
const iso = (ms: number) => new Date(ms).toISOString();

interface ProgressRow {
  format: number;
  revision: number;
  data: ArrayBuffer | Uint8Array;
  at: number;
}

/**
 * Everything kept for an account, for "Download my data": the account,
 * its Google and Discord ids, its sessions (when each runs out; the
 * tokens themselves were never kept), the profile with its summary, the
 * missions, and the progress and its backup as the page sent them,
 * gzipped, which the page opens into the file (the Worker never does).
 */
export async function exportAccount(db: Db, account: string) {
  const row = await db
    .prepare(
      "SELECT public_id, created_at, seen_day FROM accounts WHERE id = ?"
    )
    .bind(account)
    .first<{ public_id: string; created_at: number; seen_day: number }>();
  if (!row) return null;
  const all = <T>(sql: string) =>
    db
      .prepare(sql)
      .bind(account)
      .all<T>()
      .then(({ results }) => results);
  const [identities, sessions, missions] = await Promise.all([
    all<{ provider: string; subject: string; linked_at: number }>(
      "SELECT provider, subject, linked_at FROM identities WHERE account_id = ? ORDER BY linked_at"
    ),
    all<{ expires_at: number }>(
      "SELECT expires_at FROM sessions WHERE account_id = ? ORDER BY expires_at"
    ),
    all<{ mission: string; cleared_at: number }>(
      "SELECT mission, cleared_at FROM missions_cleared WHERE account_id = ? ORDER BY cleared_at, mission"
    ),
  ]);
  const profile = await db
    .prepare("SELECT * FROM profiles WHERE account_id = ?")
    .bind(account)
    .first<Record<string, unknown>>();
  const progress = await db
    .prepare(
      "SELECT format, revision, data, updated_at AS at FROM progress WHERE account_id = ?"
    )
    .bind(account)
    .first<ProgressRow>();
  const backup = await db
    .prepare(
      "SELECT format, revision, data, saved_at AS at FROM progress_backups WHERE account_id = ?"
    )
    .bind(account)
    .first<ProgressRow>();
  const saveOf = (kept: ProgressRow | null) =>
    kept && {
      format: kept.format,
      revision: kept.revision,
      savedAt: iso(kept.at),
      gzipBase64: toBase64(new Uint8Array(kept.data)),
    };

  const shownProfile = profile && {
    name: profile.name,
    sensei: profile.sensei === 1,
    favouriteStudent: profile.student,
    title: profile.title,
    banner: profile.banner,
    frame: profile.frame,
    background: profile.background,
    cardColors: profile.card_colors,
    summary: JSON.parse(String(profile.summary)) as unknown,
    editedAt: iso(Number(profile.edited_at)),
    updatedAt: iso(Number(profile.updated_at)),
  };

  return {
    account: {
      publicId: row.public_id,
      createdAt: iso(row.created_at),
      lastUsed: isoDay(row.seen_day),
    },
    identities: identities.map(({ provider, subject, linked_at }) => ({
      provider,
      id: subject,
      linkedAt: iso(linked_at),
    })),
    sessions: sessions.map(({ expires_at }) => ({ endsAt: iso(expires_at) })),
    profile: shownProfile,
    missions: missions.map(({ mission, cleared_at }) => ({
      mission,
      clearedAt: iso(cleared_at),
    })),
    progress: saveOf(progress),
    progressBackup: saveOf(backup),
  };
}

export type AccountExport = NonNullable<
  Awaited<ReturnType<typeof exportAccount>>
>;
