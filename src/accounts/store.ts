import {
  AccountView,
  isProvider,
  Provider,
  SESSION_MS,
  SIGN_IN_CODE_MS,
} from "../types/account";
import { newAccountId, newPublicId, newSecret, sha256Hex } from "./crypto";

/**
 * The accounts in D1 (accounts-worker/migrations/): who has which Google or
 * Discord, and their sessions. Written for few writes, as D1's free plan
 * allows 100,000 a day (docs/accounts.md, section 6): a session is pushed
 * back and an account marked as used at most once a day each, and nothing
 * is written to look something up.
 *
 * The secrets (session tokens, sign-in codes) are kept as their SHA-256
 * only, so the database never holds a working one.
 */

/** The part of D1 used here: D1Database is one, and so is the tests' copy. */
export interface Db {
  prepare(sql: string): Statement;
  batch(statements: Statement[]): Promise<unknown[]>;
}

export interface Statement {
  bind(...values: unknown[]): Statement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
  run(): Promise<unknown>;
}

const DAY_MS = 24 * 60 * 60_000;
/** Days since 1970: when an account was last used, to the day. */
export const dayOf = (now: number) => Math.floor(now / DAY_MS);

/** The account a Google or Discord id belongs to, if any. */
export async function findIdentity(
  db: Db,
  provider: Provider,
  subject: string
): Promise<string | null> {
  const row = await db
    .prepare(
      "SELECT account_id FROM identities WHERE provider = ? AND subject = ?"
    )
    .bind(provider, subject)
    .first<{ account_id: string }>();
  return row?.account_id ?? null;
}

/** A new account, with the identity it was made from. */
export async function createAccount(
  db: Db,
  provider: Provider,
  subject: string,
  now: number
): Promise<string> {
  const id = newAccountId();
  await db.batch([
    db
      .prepare(
        "INSERT INTO accounts (id, public_id, created_at, seen_day) VALUES (?, ?, ?, ?)"
      )
      .bind(id, newPublicId(), now, dayOf(now)),
    db
      .prepare(
        "INSERT INTO identities (provider, subject, account_id, linked_at) VALUES (?, ?, ?, ?)"
      )
      .bind(provider, subject, id, now),
  ]);
  return id;
}

/**
 * Links another Google or Discord to an account: "linked", or why not:
 * "already" (it's this account's), "taken" (another account's), or "has"
 * (this account has one from that provider already).
 */
export async function linkIdentity(
  db: Db,
  account: string,
  provider: Provider,
  subject: string,
  now: number
): Promise<"linked" | "already" | "taken" | "has"> {
  const owner = await findIdentity(db, provider, subject);
  if (owner === account) return "already";
  if (owner) return "taken";
  const mine = await db
    .prepare("SELECT 1 FROM identities WHERE account_id = ? AND provider = ?")
    .bind(account, provider)
    .first();
  if (mine) return "has";
  await db
    .prepare(
      "INSERT INTO identities (provider, subject, account_id, linked_at) VALUES (?, ?, ?, ?)"
    )
    .bind(provider, subject, account, now)
    .run();
  return "linked";
}

/**
 * Unlinks a provider from an account, unless it's the last way in:
 * "unlinked", "last", or "none" (it had none from that provider).
 */
export async function unlinkIdentity(
  db: Db,
  account: string,
  provider: Provider
): Promise<"unlinked" | "last" | "none"> {
  const { results } = await db
    .prepare("SELECT provider FROM identities WHERE account_id = ?")
    .bind(account)
    .all<{ provider: string }>();
  if (!results.some((row) => row.provider === provider)) return "none";
  if (results.length <= 1) return "last";
  await db
    .prepare("DELETE FROM identities WHERE account_id = ? AND provider = ?")
    .bind(account, provider)
    .run();
  return "unlinked";
}

/**
 * A one-time code for the page to swap for a session, good for a minute.
 * Codes left unused are cleared as new ones are made.
 */
export async function createSignInCode(
  db: Db,
  account: string,
  now: number
): Promise<string> {
  const code = newSecret();
  await db.batch([
    db.prepare("DELETE FROM sign_in_codes WHERE expires_at < ?").bind(now),
    db
      .prepare(
        "INSERT INTO sign_in_codes (code_hash, account_id, expires_at) VALUES (?, ?, ?)"
      )
      .bind(await sha256Hex(code), account, now + SIGN_IN_CODE_MS),
  ]);
  return code;
}

/** The account a sign-in code was for, once: the code is gone after. */
export async function takeSignInCode(
  db: Db,
  code: string,
  now: number
): Promise<string | null> {
  const row = await db
    .prepare(
      "DELETE FROM sign_in_codes WHERE code_hash = ? RETURNING account_id, expires_at"
    )
    .bind(await sha256Hex(code))
    .first<{ account_id: string; expires_at: number }>();
  return row && row.expires_at >= now ? row.account_id : null;
}

/** A new session: its token, which only the page will ever hold. */
export async function createSession(
  db: Db,
  account: string,
  now: number
): Promise<string> {
  const token = newSecret();
  await db.batch([
    db
      .prepare(
        "INSERT INTO sessions (token_hash, account_id, expires_at) VALUES (?, ?, ?)"
      )
      .bind(await sha256Hex(token), account, now + SESSION_MS),
    // A sign-in is a use: the two years unused start again (/privacy).
    db
      .prepare("UPDATE accounts SET seen_day = ? WHERE id = ? AND seen_day < ?")
      .bind(dayOf(now), account, dayOf(now)),
  ]);
  return token;
}

/**
 * The account a session token is for, or null if it's unknown or has run
 * out (then it's deleted). A session in use is pushed back to 90 days, and
 * its account marked as used today, each at most once a day.
 */
export async function sessionAccount(
  db: Db,
  token: string,
  now: number
): Promise<string | null> {
  const hash = await sha256Hex(token);
  const row = await db
    .prepare(
      `SELECT s.account_id, s.expires_at, a.seen_day
       FROM sessions s JOIN accounts a ON a.id = s.account_id
       WHERE s.token_hash = ?`
    )
    .bind(hash)
    .first<{ account_id: string; expires_at: number; seen_day: number }>();
  if (!row) return null;
  if (row.expires_at < now) {
    await db
      .prepare("DELETE FROM sessions WHERE token_hash = ?")
      .bind(hash)
      .run();
    return null;
  }
  const writes: Statement[] = [];
  if (row.expires_at - now < SESSION_MS - DAY_MS) {
    writes.push(
      db
        .prepare("UPDATE sessions SET expires_at = ? WHERE token_hash = ?")
        .bind(now + SESSION_MS, hash)
    );
  }
  if (row.seen_day < dayOf(now)) {
    writes.push(
      db
        .prepare("UPDATE accounts SET seen_day = ? WHERE id = ?")
        .bind(dayOf(now), row.account_id)
    );
  }
  if (writes.length) await db.batch(writes);
  return row.account_id;
}

/** Signs a session out: its token works no more. */
export async function endSession(db: Db, token: string): Promise<void> {
  await db
    .prepare("DELETE FROM sessions WHERE token_hash = ?")
    .bind(await sha256Hex(token))
    .run();
}

/** The account as the page sees it: never its own id or the provider ids. */
export async function accountView(
  db: Db,
  account: string
): Promise<AccountView | null> {
  const row = await db
    .prepare(
      "SELECT public_id, created_at, profile_shown FROM accounts WHERE id = ?"
    )
    .bind(account)
    .first<{ public_id: string; created_at: number; profile_shown: number }>();
  if (!row) return null;
  const { results } = await db
    .prepare(
      "SELECT provider, linked_at FROM identities WHERE account_id = ? ORDER BY linked_at"
    )
    .bind(account)
    .all<{ provider: string; linked_at: number }>();
  return {
    publicId: row.public_id,
    createdAt: row.created_at,
    identities: results.flatMap(({ provider, linked_at }) =>
      isProvider(provider) ? [{ provider, linkedAt: linked_at }] : []
    ),
    profileShown: row.profile_shown === 1,
  };
}
