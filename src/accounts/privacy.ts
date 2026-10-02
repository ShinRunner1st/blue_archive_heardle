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
 * gzipped, which the page opens into the file (the Worker never does);
 * and the verified record, with the daily time zone.
 */
export async function exportAccount(db: Db, account: string) {
  const row = await db
    .prepare(
      "SELECT public_id, created_at, seen_day, profile_shown FROM accounts WHERE id = ?"
    )
    .bind(account)
    .first<{
      public_id: string;
      created_at: number;
      seen_day: number;
      profile_shown: number;
    }>();
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
  const verified = await exportVerified(db, account);
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
      // Whether players in a room may see the profile (docs/room-profiles.md).
      profileShownInRooms: row.profile_shown === 1,
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
    verified,
  };
}

/** A JSON column back as it was written; null if it's empty or broken. */
function parsed(text: string | null): unknown {
  if (text === null) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

/**
 * The account's verified record (docs/verified-stats.md, section 10), as
 * kept: its daily time zone, every verified daily attempt with its moves,
 * the summary of each, and the room results from receipts. Apart from the
 * progress in the file, as it is in the database.
 */
async function exportVerified(db: Db, account: string) {
  const all = <T>(sql: string) =>
    db
      .prepare(sql)
      .bind(account)
      .all<T>()
      .then(({ results }) => results);
  const clock = await db
    .prepare("SELECT zone, set_at FROM verified_clock WHERE account_id = ?")
    .bind(account)
    .first<{ zone: string; set_at: number }>();
  const [dailies, summaries, rooms] = await Promise.all([
    all<{
      day: number;
      game: string;
      attempt_id: string;
      started_at: number;
      finished_at: number | null;
      outcome: string | null;
      tries: number | null;
      guesses: string | null;
      time_verified: number | null;
    }>(
      `SELECT day, game, attempt_id, started_at, finished_at, outcome, tries, guesses, time_verified
       FROM verified_daily WHERE account_id = ? ORDER BY day, game`
    ),
    all<{
      game: string;
      played: number;
      won: number;
      abandoned: number;
      spread: string;
      best_streak: number;
      best_time: number | null;
      first_day: number;
    }>(
      `SELECT game, played, won, abandoned, spread, best_streak, best_time, first_day
       FROM verified_summary WHERE account_id = ? ORDER BY game`
    ),
    all<{
      game_id: string;
      game: string;
      answers: string;
      rounds: number;
      players: number;
      place: number;
      score: number;
      ended_at: number;
    }>(
      `SELECT game_id, game, answers, rounds, players, place, score, ended_at
       FROM verified_room WHERE account_id = ? ORDER BY ended_at, game_id`
    ),
  ]);
  return {
    dailyTimeZone: clock && { zone: clock.zone, setAt: iso(clock.set_at) },
    dailies: dailies.map((row) => ({
      daily: row.game,
      puzzle: row.day,
      attemptId: row.attempt_id,
      startedAt: iso(row.started_at),
      finishedAt: row.finished_at === null ? null : iso(row.finished_at),
      // Open: started, not yet finished or closed.
      outcome: row.outcome ?? "open",
      tries: row.tries,
      moves: parsed(row.guesses),
      timeMs:
        row.finished_at === null || row.outcome === "abandoned"
          ? null
          : row.finished_at - row.started_at,
      timeCounted: row.time_verified === null ? null : row.time_verified === 1,
    })),
    summaries: summaries.map((row) => ({
      game: row.game,
      played: row.played,
      won: row.won,
      abandoned: row.abandoned,
      spread: parsed(row.spread),
      bestStreak: row.best_streak,
      bestTimeMs: row.best_time,
      firstPuzzle: row.first_day,
    })),
    rooms: rooms.map((row) => ({
      gameId: row.game_id,
      game: row.game,
      answers: row.answers,
      rounds: row.rounds,
      players: row.players,
      place: row.place,
      score: row.score,
      endedAt: iso(row.ended_at),
    })),
  };
}

export type AccountExport = NonNullable<
  Awaited<ReturnType<typeof exportAccount>>
>;
