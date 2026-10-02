import { cleanLook, unlockedLook } from "../helpers/roomLook";
import { ROOM_PASS_MS, RoomPass } from "../types/room";
import { readSigned, signValue } from "./crypto";
import { readProfile } from "./profile";
import { Db } from "./store";

/**
 * A signed-in player's room pass (docs/accounts.md, section 7): who they
 * are in a room, signed with ROOM_PASS_KEY, which the accounts and rooms
 * Workers share, so a room can check it with no call to D1. Made here from
 * the account's profile and its missions; read by the rooms Worker.
 *
 * It names the account by its public id only, never its own id or its
 * Google or Discord one, and holds nothing that isn't shown in a room.
 */

/** Keeps a pass from passing for a sign-in's state or a link ticket. */
const KIND = "room";

/** A public id: 80 bits as base32 (crypto.ts's newPublicId). */
const PUBLIC_ID = /^[a-z2-7]{16}$/;

/**
 * The pass for an account, good for ROOM_PASS_MS: its profile's name,
 * favourite student and cosmetics, each cosmetic only if one of the
 * account's cleared missions unlocks it. Two queries, about 40 rows read.
 */
export async function makeRoomPass(
  db: Db,
  account: string,
  key: string,
  now: number
): Promise<{ pass: string; expires: number } | null> {
  const row = await db
    .prepare("SELECT public_id, profile_shown FROM accounts WHERE id = ?")
    .bind(account)
    .first<{ public_id: string; profile_shown: number }>();
  if (!row) return null;
  const profile = await readProfile(db, account);
  const { results } = await db
    .prepare("SELECT mission FROM missions_cleared WHERE account_id = ?")
    .bind(account)
    .all<{ mission: string }>();
  const expires = now + ROOM_PASS_MS;
  const look = unlockedLook(
    cleanLook(profile ?? {}),
    results.map(({ mission }) => mission)
  );
  const pass = await signValue(
    KIND,
    {
      p: row.public_id,
      n: profile?.name ?? "",
      s: profile?.student ?? null,
      l: [
        look.title,
        look.banner,
        look.frame,
        look.background,
        look.nameEffect,
      ],
      e: expires,
      // Its profile hidden from the room (docs/room-profiles.md): the room
      // neither marks its card nor signs a ticket for it.
      ...(row.profile_shown === 1 ? {} : { h: 1 }),
    },
    key
  );
  return { pass, expires };
}

/**
 * A pass back, if it's signed with the key and hasn't run out; null
 * otherwise, and the player is then a guest. Its cosmetics are checked to
 * exist too, in case one was taken out of the game since it was signed.
 */
export async function readRoomPass(
  text: string,
  key: string,
  now: number
): Promise<RoomPass | null> {
  const value = await readSigned(KIND, text, key);
  if (!value) return null;
  const { p, n, s, l, e, h } = value;
  if (
    typeof p !== "string" ||
    !PUBLIC_ID.test(p) ||
    typeof n !== "string" ||
    !(s === null || (typeof s === "number" && Number.isSafeInteger(s))) ||
    !Array.isArray(l) ||
    // Four before name effects: a pass from then wears the plain one.
    (l.length !== 4 && l.length !== 5) ||
    typeof e !== "number" ||
    e < now ||
    (h !== undefined && h !== 1)
  ) {
    return null;
  }
  const [title, banner, frame, background, nameEffect] = l as unknown[];
  return {
    publicId: p,
    name: n,
    student: s,
    look: cleanLook({ title, banner, frame, background, nameEffect }),
    expires: e,
    ...(h === 1 ? { hidden: true as const } : {}),
  };
}
