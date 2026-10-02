import { PROFILE_TICKET_MS } from "../types/account";
import { readSigned, signValue } from "./crypto";

/**
 * A room's ticket for a signed-in player's profile (docs/room-profiles.md):
 * the room signs it for the player whose card was tapped and hands it only
 * to the one who asked; the accounts Worker reads it back. Its format and
 * checks alone, with nothing of D1, as the rooms Worker bundles it;
 * profileView.ts shows the profile.
 *
 * Signed with ROOM_PASS_KEY, which the two Workers share, under its own
 * kind, so it can't pass for a room pass, a receipt, a sign-in's state or
 * a link ticket.
 */

/** Keeps a ticket from passing for anything else signed with the key. */
const KIND = "profile-view";

/** A public id: 80 bits as base32 (crypto.ts's newPublicId). */
const PUBLIC_ID = /^[a-z2-7]{16}$/;

/** A room's clock may run a little ahead of the accounts Worker's. */
const SKEW_MS = 60_000;

/** A ticket for a profile, good for PROFILE_TICKET_MS. */
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
