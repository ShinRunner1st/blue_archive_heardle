import { DAILY_EPOCH } from "../constants/game";
import {
  isDay,
  isVerifiedDaily,
  judgeDaily,
  VERIFIED_DAILIES,
  VerifiedDaily,
} from "../helpers/verifiedDaily";
import {
  FinishAnswer,
  LATE_DAYS,
  StartAnswer,
  VerifiedDailyStats,
  VerifiedOutcome,
  VerifiedView,
} from "../types/verified";
import { randomBase32 } from "./crypto";
import { Db, Statement } from "./store";

/**
 * Verified dailies (docs/verified-stats.md, sections 4 to 7): the server
 * issues an attempt before the player plays, judges the guesses itself
 * with the page's own rules (helpers/verifiedDaily.ts), and keeps the
 * result, its time and the daily's summary. Nothing here reads or writes
 * the progress, the profile or its summary, and nothing there reads this.
 *
 * Each function answers with an HTTP status and a body, for api.ts.
 */

export interface Answer {
  status: number;
  body: unknown;
}

const DAY_MS = 24 * 60 * 60_000;

const EPOCH = (() => {
  const [year, month, day] = DAILY_EPOCH.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
})();

const formats = new Map<string, Intl.DateTimeFormat>();

function formatIn(zone: string): Intl.DateTimeFormat {
  let format = formats.get(zone);
  if (!format) {
    format = new Intl.DateTimeFormat("en-US", {
      timeZone: zone,
      year: "numeric",
      month: "numeric",
      day: "numeric",
    });
    formats.set(zone, format);
  }
  return format;
}

/**
 * A time zone's IANA name as the runtime knows it, or null if it isn't one.
 * The page sends its own; it's never worked out from the address.
 */
export function checkZone(zone: unknown): string | null {
  if (
    typeof zone !== "string" ||
    zone.length === 0 ||
    zone.length > 64 ||
    !/^[A-Za-z0-9_+\-/]+$/.test(zone)
  ) {
    return null;
  }
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: zone,
    }).resolvedOptions().timeZone;
  } catch {
    return null;
  }
}

/**
 * The puzzle number at an instant in a time zone: the local calendar date
 * there, counted from DAILY_EPOCH as the page's dayNumber counts, never
 * below 1. The instant is the server's clock, never the device's.
 */
export function dayInZone(zone: string, now: number): number {
  const parts = formatIn(zone).formatToParts(new Date(now));
  const part = (type: string) =>
    Number(parts.find((each) => each.type === type)?.value);
  const date = Date.UTC(part("year"), part("month") - 1, part("day"));
  return Math.max(1, Math.round((date - EPOCH) / DAY_MS) + 1);
}

/**
 * What the page holds for an attempt: its day, its daily and its random
 * id, so finishing finds the row by its key, with no index.
 */
const ATTEMPT = /^(\d{1,7})~([a-z]+(?:\.[a-z]+)?)~([a-z2-7]{26})$/;

const attemptToken = (day: number, game: string, id: string) =>
  `${day}~${game}~${id}`;

function readAttempt(
  token: unknown
): { day: number; game: VerifiedDaily; id: string } | null {
  const match = typeof token === "string" ? ATTEMPT.exec(token) : null;
  if (!match) return null;
  const day = Number(match[1]);
  const game = match[2];
  if (!isDay(day) || !isVerifiedDaily(game)) return null;
  return { day, game, id: match[3] };
}

/** How many rows a write changed, from D1's answer. */
export const changesOf = (result: unknown) =>
  Number((result as { meta?: { changes?: number } } | null)?.meta?.changes) ||
  0;

const bad = (error = "bad"): Answer => ({ status: 400, body: { error } });

/**
 * One finish, close or receipt counted in a summary. It's batched straight
 * after the write it counts and applies only if that write changed a row
 * (`changes()`, the previous statement's, in the batch's one transaction),
 * so a finish or receipt arriving twice is counted once.
 */
export function countInSummary(
  db: Db,
  account: string,
  game: string,
  count: {
    won: boolean;
    abandoned: boolean;
    /** The spread's key to add one to: tries won, or a room's place. */
    key: string | null;
    streak: number;
    time: number | null;
    day: number;
  }
): Statement {
  return db
    .prepare(
      `INSERT INTO verified_summary
         (account_id, game, played, won, abandoned, spread, best_streak, best_time, first_day)
       SELECT ?1, ?2, 1, ?3, ?4,
         CASE WHEN ?5 IS NULL THEN '{}' ELSE json_object(?5, 1) END, ?6, ?7, ?8
       WHERE changes() = 1
       ON CONFLICT (account_id, game) DO UPDATE SET
         played = played + 1,
         won = won + excluded.won,
         abandoned = abandoned + excluded.abandoned,
         spread = CASE WHEN ?5 IS NULL THEN spread ELSE json_set(spread,
           '$."' || ?5 || '"', COALESCE(json_extract(spread, '$."' || ?5 || '"'), 0) + 1) END,
         best_streak = MAX(best_streak, excluded.best_streak),
         best_time = CASE
           WHEN excluded.best_time IS NULL THEN best_time
           WHEN best_time IS NULL THEN excluded.best_time
           ELSE MIN(best_time, excluded.best_time) END,
         first_day = MIN(first_day, excluded.first_day)`
    )
    .bind(
      account,
      game,
      count.won ? 1 : 0,
      count.abandoned ? 1 : 0,
      count.key,
      count.streak,
      count.time,
      count.day
    );
}

/** Closes an open attempt as abandoned, counted as played and lost. */
function closeStatements(
  db: Db,
  account: string,
  day: number,
  game: string,
  now: number
): Statement[] {
  return [
    db
      .prepare(
        `UPDATE verified_daily SET outcome = 'abandoned', finished_at = ?
         WHERE account_id = ? AND day = ? AND game = ? AND outcome IS NULL`
      )
      .bind(now, account, day, game),
    countInSummary(db, account, game, {
      won: false,
      abandoned: true,
      key: null,
      streak: 0,
      time: null,
      day,
    }),
  ];
}

/** The account's latest attempt's day, by key: one row. */
async function latestDay(db: Db, account: string): Promise<number | null> {
  const row = await db
    .prepare(
      "SELECT day FROM verified_daily WHERE account_id = ? ORDER BY day DESC LIMIT 1"
    )
    .bind(account)
    .first<{ day: number }>();
  return row?.day ?? null;
}

/**
 * Closes the attempts left open past their deadline (section 6), lazily:
 * as the account next starts a daily or reads its stats, not by a daily
 * scan. Each start and read closes everything older, and no attempt is
 * made before the latest, so only days from the one before the latest
 * attempt can still be open: a few rows, read by key.
 */
async function closeLate(
  db: Db,
  account: string,
  latest: number | null,
  today: number,
  now: number
): Promise<void> {
  const to = today - LATE_DAYS - 1;
  if (latest === null || to < latest - 1) return;
  const { results } = await db
    .prepare(
      `SELECT day, game FROM verified_daily
       WHERE account_id = ? AND day BETWEEN ? AND ? AND outcome IS NULL`
    )
    .bind(account, latest - 1, to)
    .all<{ day: number; game: string }>();
  if (results.length === 0) return;
  await db.batch(
    results.flatMap(({ day, game }) =>
      closeStatements(db, account, day, game, now)
    )
  );
}

/**
 * Days read at a time when walking a streak back: a week first, then twice
 * as many each time the streak goes on, so a short streak reads a few
 * rows and a long one about as many as it is long.
 */
const FIRST_PAGE_DAYS = 8;
const MOST_PAGE_DAYS = 64;

/**
 * The account's attempts, read newest first a page of days at a time, only
 * as far back as a streak goes: each daily's outcome by day, null while
 * open, undefined for a day with no attempt.
 */
function history(db: Db, account: string, top: number) {
  const byGame = new Map<string, Map<number, string | null>>();
  let low = top + 1;
  let pageDays = FIRST_PAGE_DAYS;
  return async (game: string, day: number) => {
    while (day < low && low > 1) {
      const from = Math.max(1, low - pageDays);
      pageDays = Math.min(pageDays * 2, MOST_PAGE_DAYS);
      const { results } = await db
        .prepare(
          `SELECT day, game, outcome FROM verified_daily
           WHERE account_id = ? AND day BETWEEN ? AND ?`
        )
        .bind(account, from, low - 1)
        .all<{ day: number; game: string; outcome: string | null }>();
      for (const row of results) {
        const days = byGame.get(row.game) ?? new Map();
        days.set(row.day, row.outcome);
        byGame.set(row.game, days);
      }
      low = from;
    }
    return byGame.get(game)?.get(day);
  };
}

/** The run of days won that a win on `day` belongs to, `day` included. */
async function runWith(
  db: Db,
  account: string,
  game: string,
  day: number,
  today: number
): Promise<number> {
  const outcome = history(db, account, Math.max(today, day));
  let run = 1;
  for (let d = day + 1; d <= today; d++) {
    if ((await outcome(game, d)) !== "won") break;
    run += 1;
  }
  for (let d = day - 1; d >= 1; d--) {
    if ((await outcome(game, d)) !== "won") break;
    run += 1;
  }
  return run;
}

/**
 * Days won in a row, up to today: today not yet played or still open, or
 * yesterday still open and finishable, doesn't break it; a loss, an
 * abandoned attempt or a day missed does.
 */
async function currentStreak(
  outcome: (game: string, day: number) => Promise<string | null | undefined>,
  game: string,
  today: number
): Promise<number> {
  let streak = 0;
  for (let d = today; d >= 1; d--) {
    const result = await outcome(game, d);
    if (result === "won") {
      streak += 1;
      continue;
    }
    const pending =
      (result === null && d >= today - LATE_DAYS) ||
      (result === undefined && d === today);
    if (!pending) break;
  }
  return streak;
}

/**
 * `{ action: "start" }`: issues the day's attempt before the player plays
 * (section 5), in the account's daily time zone (section 4).
 */
export async function startDaily(
  db: Db,
  account: string,
  input: Record<string, unknown>,
  now: number
): Promise<Answer> {
  const { game, day } = input;
  const zone = checkZone(input.zone);
  if (!isVerifiedDaily(game) || !isDay(day) || !zone) return bad();

  const kept = await db
    .prepare("SELECT zone FROM verified_clock WHERE account_id = ?")
    .bind(account)
    .first<{ zone: string }>();
  const latest = await latestDay(db, account);

  // The zone the account's day follows: set the first time, then changed
  // only if the new zone's day isn't behind the old one's.
  let use = kept?.zone ?? zone;
  let clock: Statement | null = null;
  if (!kept) {
    clock = db
      .prepare(
        "INSERT INTO verified_clock (account_id, zone, set_at) VALUES (?, ?, ?)"
      )
      .bind(account, zone, now);
  } else if (
    kept.zone !== zone &&
    dayInZone(zone, now) >= dayInZone(kept.zone, now)
  ) {
    use = zone;
    clock = db
      .prepare(
        "UPDATE verified_clock SET zone = ?, set_at = ? WHERE account_id = ?"
      )
      .bind(zone, now, account);
  }
  const today = dayInZone(use, now);

  // Nothing is written unless the attempt is issued.
  if (latest !== null && today < latest) {
    return { status: 409, body: { error: "behind", day: latest } };
  }
  if (day !== today) return { status: 409, body: { error: "day", day: today } };

  await closeLate(db, account, latest, today, now);

  const id = randomBase32(16);
  const insert = db
    .prepare(
      `INSERT INTO verified_daily (account_id, day, game, attempt_id, started_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT (account_id, day, game) DO NOTHING`
    )
    .bind(account, day, game, id, now);
  const results = await db.batch(clock ? [clock, insert] : [insert]);
  if (changesOf(results[results.length - 1]) === 1) {
    const started: StartAnswer = {
      status: "started",
      attempt: attemptToken(day, game, id),
      day,
    };
    return { status: 200, body: started };
  }

  const existing = await db
    .prepare(
      `SELECT attempt_id, outcome, tries FROM verified_daily
       WHERE account_id = ? AND day = ? AND game = ?`
    )
    .bind(account, day, game)
    .first<{
      attempt_id: string;
      outcome: VerifiedOutcome | null;
      tries: number | null;
    }>();
  if (!existing) return { status: 500, body: { error: "failed" } };
  const answer: StartAnswer = existing.outcome
    ? { status: "done", outcome: existing.outcome, tries: existing.tries }
    : {
        status: "open",
        attempt: attemptToken(day, game, existing.attempt_id),
        day,
      };
  return { status: 200, body: answer };
}

interface AttemptRow {
  attempt_id: string;
  started_at: number;
  finished_at: number | null;
  outcome: VerifiedOutcome | null;
  tries: number | null;
  time_verified: number | null;
}

/** A finished attempt's answer, the same however often it's asked. */
function doneAnswer(row: AttemptRow): Answer {
  const finished: FinishAnswer = {
    status: "done",
    outcome: row.outcome!,
    tries: row.tries,
    time:
      row.outcome === "abandoned" || row.finished_at === null
        ? null
        : row.finished_at - row.started_at,
    timeVerified: row.time_verified === 1,
  };
  return { status: 200, body: finished };
}

/**
 * `{ action: "finish" }`: judges the attempt's guesses with the game's own
 * rules and keeps the result (section 5), late if need be (section 6).
 */
export async function finishDaily(
  db: Db,
  account: string,
  input: Record<string, unknown>,
  now: number
): Promise<Answer> {
  const attempt = readAttempt(input.attempt);
  if (!attempt) return bad();
  if (input.retry !== undefined && typeof input.retry !== "boolean") {
    return bad();
  }
  const { day, game, id } = attempt;

  const row = await db
    .prepare(
      `SELECT attempt_id, started_at, finished_at, outcome, tries, time_verified
       FROM verified_daily WHERE account_id = ? AND day = ? AND game = ?`
    )
    .bind(account, day, game)
    .first<AttemptRow>();
  if (!row || row.attempt_id !== id) {
    return { status: 404, body: { error: "unknown" } };
  }
  if (row.outcome === "abandoned") {
    return { status: 409, body: { error: "closed" } };
  }
  if (row.outcome) return doneAnswer(row);

  const clock = await db
    .prepare("SELECT zone FROM verified_clock WHERE account_id = ?")
    .bind(account)
    .first<{ zone: string }>();
  const today = clock ? dayInZone(clock.zone, now) : day;

  // Past its deadline: closed now, as abandoned.
  if (today > day + LATE_DAYS) {
    await db.batch(closeStatements(db, account, day, game, now));
    return { status: 409, body: { error: "late" } };
  }

  if (!Array.isArray(input.guesses)) return bad();
  const judged = judgeDaily(game, day, {
    guesses: input.guesses,
    gaveUp: input.gaveUp,
  });
  if (!judged.valid) {
    return {
      status: 400,
      body: { error: "invalid", reason: judged.reason, at: judged.at },
    };
  }
  if (judged.outcome === "playing") return bad("unfinished");

  const won = judged.outcome === "won";
  const timeVerified = input.retry !== true && today === day;
  const time = now - row.started_at;
  const moves = JSON.stringify({
    guesses: input.guesses,
    ...(input.gaveUp === true ? { gaveUp: true } : {}),
  });

  const results = await db.batch([
    db
      .prepare(
        `UPDATE verified_daily
         SET finished_at = ?, outcome = ?, tries = ?, guesses = ?, time_verified = ?
         WHERE account_id = ? AND day = ? AND game = ? AND outcome IS NULL`
      )
      .bind(
        now,
        judged.outcome,
        judged.tries,
        moves,
        timeVerified ? 1 : 0,
        account,
        day,
        game
      ),
    countInSummary(db, account, game, {
      won,
      abandoned: false,
      key: won ? String(judged.tries) : null,
      streak: won ? await runWith(db, account, game, day, today) : 0,
      time: won && timeVerified ? time : null,
      day,
    }),
  ]);
  if (changesOf(results[0]) !== 1) {
    // Finished from another device a moment before: its result stands.
    const again = await db
      .prepare(
        `SELECT attempt_id, started_at, finished_at, outcome, tries, time_verified
         FROM verified_daily WHERE account_id = ? AND day = ? AND game = ?`
      )
      .bind(account, day, game)
      .first<AttemptRow>();
    return again?.outcome
      ? doneAnswer(again)
      : { status: 500, body: { error: "failed" } };
  }

  const finished: FinishAnswer = {
    status: "finished",
    outcome: judged.outcome,
    tries: judged.tries,
    time,
    timeVerified,
  };
  return { status: 200, body: finished };
}

interface SummaryRow {
  game: string;
  played: number;
  won: number;
  abandoned: number;
  spread: string;
  best_streak: number;
  best_time: number | null;
  first_day: number;
}

const spreadOf = (text: string): Record<string, number> => {
  try {
    const value: unknown = JSON.parse(text);
    return typeof value === "object" && value !== null
      ? (value as Record<string, number>)
      : {};
  } catch {
    return {};
  }
};

/** `GET /verified`: the account's verified record (section 9). */
export async function readVerified(
  db: Db,
  account: string,
  now: number
): Promise<VerifiedView> {
  const clock = await db
    .prepare("SELECT zone FROM verified_clock WHERE account_id = ?")
    .bind(account)
    .first<{ zone: string }>();
  const today = clock ? dayInZone(clock.zone, now) : null;
  if (clock && today !== null) {
    await closeLate(db, account, await latestDay(db, account), today, now);
  }

  const { results } = await db
    .prepare(
      `SELECT game, played, won, abandoned, spread, best_streak, best_time, first_day
       FROM verified_summary WHERE account_id = ?`
    )
    .bind(account)
    .all<SummaryRow>();

  const outcome = today === null ? null : history(db, account, today);
  const dailies: Record<string, VerifiedDailyStats> = {};
  for (const daily of VERIFIED_DAILIES) {
    const row = results.find(({ game }) => game === daily);
    if (!row) continue;
    dailies[daily] = {
      played: row.played,
      won: row.won,
      lost: row.played - row.won - row.abandoned,
      abandoned: row.abandoned,
      spread: spreadOf(row.spread),
      streak:
        outcome && today !== null
          ? await currentStreak(outcome, daily, today)
          : 0,
      bestStreak: row.best_streak,
      bestTime: row.best_time,
      firstDay: row.first_day,
    };
  }

  const rooms = results.find(({ game }) => game === "rooms");
  return {
    zone: clock?.zone ?? null,
    today,
    since: results.length
      ? Math.min(...results.map(({ first_day }) => first_day))
      : null,
    dailies,
    rooms: rooms
      ? {
          played: rooms.played,
          first: rooms.won,
          places: spreadOf(rooms.spread),
          firstDay: rooms.first_day,
        }
      : null,
  };
}
