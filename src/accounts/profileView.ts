import {
  PROFILE_TICKET_MS,
  ProfileSummary,
  ProfileViewAnswer,
} from "../types/account";
import { readSigned, signValue } from "./crypto";
import { Db } from "./store";
import { readVerifiedTotals } from "./verified";

/**
 * Profiles from a card (docs/room-profiles.md): a player in a room taps a
 * signed-in player's card; the room, which has that player's public id from
 * their pass, signs a short-lived ticket for it and hands it only to the
 * one who asked; the page brings it here for the profile. So pages never
 * learn a public id, nobody needs a session to look (guests can), and a
 * ticket only works for a few minutes, for what anyone in that room could
 * see.
 *
 * Signed with ROOM_PASS_KEY, which the rooms Worker shares, under its own
 * kind, so it can't pass for a room pass, a receipt, a sign-in's state or
 * a link ticket.
 */

/** Keeps a ticket from passing for anything else signed with the key. */
const KIND = "profile-view";

/** A public id: 80 bits as base32 (crypto.ts's newPublicId). */
const PUBLIC_ID = /^[a-z2-7]{16}$/;

/** A room's clock may run a little ahead of this Worker's. */
const SKEW_MS = 60_000;

/** A ticket for a profile, good for PROFILE_TICKET_MS (the rooms sign it). */
export function makeProfileTicket(
  publicId: string,
  key: string,
  now: number
): Promise<string> {
  return signValue(KIND, { p: publicId, e: now + PROFILE_TICKET_MS }, key);
}

/**
 * The public id a ticket is for, or null if it isn't one: changed, signed
 * for another kind or with another key, run out, or from further ahead
 * than a room's clock could be.
 */
export async function readProfileTicket(
  token: unknown,
  key: string,
  now: number
): Promise<string | null> {
  if (typeof token !== "string" || token.length > 256) return null;
  const value = await readSigned(KIND, token, key);
  if (!value) return null;
  const { p, e } = value;
  if (
    typeof p !== "string" ||
    !PUBLIC_ID.test(p) ||
    typeof e !== "number" ||
    !Number.isSafeInteger(e) ||
    e < now ||
    e > now + PROFILE_TICKET_MS + SKEW_MS
  ) {
    return null;
  }
  return p;
}

/** The summary as kept: the page's cache of its saves, or null. */
function summaryOf(text: string | undefined): ProfileSummary | null {
  if (!text) return null;
  try {
    const value: unknown = JSON.parse(text);
    return typeof value === "object" && value !== null
      ? (value as ProfileSummary)
      : null;
  } catch {
    return null;
  }
}

/**
 * The profile another player sees, by public id; null for none, or one
 * its player has hidden. Reads the account by its public id (unique, so
 * one row), the profile's summary, and the verified summary rows: no
 * current streaks, nothing closed or written, no session.
 */
export async function readProfileView(
  db: Db,
  publicId: string
): Promise<ProfileViewAnswer | null> {
  const row = await db
    .prepare("SELECT id, profile_shown FROM accounts WHERE public_id = ?")
    .bind(publicId)
    .first<{ id: string; profile_shown: number }>();
  if (!row || row.profile_shown !== 1) return null;
  const profile = await db
    .prepare("SELECT summary FROM profiles WHERE account_id = ?")
    .bind(row.id)
    .first<{ summary: string }>();
  return {
    summary: summaryOf(profile?.summary),
    verified: await readVerifiedTotals(db, row.id),
  };
}

/** The Account tab's switch: whether players in a room may see it. */
export async function setProfileShown(
  db: Db,
  account: string,
  shown: boolean
): Promise<void> {
  await db
    .prepare("UPDATE accounts SET profile_shown = ? WHERE id = ?")
    .bind(shown ? 1 : 0, account)
    .run();
}
