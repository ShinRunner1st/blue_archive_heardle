import { RoomLook } from "../types/room";
import { accountsEnabled, hasSession } from "./accountFlag";
import { cardTitle, pickedOf } from "./cosmetics";
import { loadClearedMissions } from "./missions";
import { profileEditedAt } from "./profileEdit";

/**
 * Who the player is in a room (docs/accounts.md, section 7): the
 * cosmetics their card wears, sent with every hello, and, signed in, a
 * room pass from the account, which a room takes in their place.
 *
 * The pass is kept in this page's memory only: never in storage, an
 * address or the page, and sent nowhere but a room's hello. A guest never
 * asks for one or loads the code that would.
 */

/** The cosmetics picked here, unlocked here: what a guest's card wears. */
export function ownLook(): RoomLook {
  return {
    title: cardTitle().id,
    banner: pickedOf("banner").id,
    frame: pickedOf("frame").id,
    background: pickedOf("background").id,
  };
}

/**
 * Whether this page may have a pass to send: signed in, where accounts are
 * on. Otherwise a room is joined at once, as ever.
 */
export const mayHavePass = () => accountsEnabled() && hasSession();

/** A pass with less than this left is asked for again. */
const FRESH_MS = 30 * 60_000;
/** The longest a join waits for a pass before going in as a guest would. */
const WAIT_MS = 4000;

interface Held {
  pass: string;
  expires: number;
  /** The profile and missions it was made from, as this page had them. */
  made: string;
}

let held: Held | null = null;
let asking: Promise<string | null> | null = null;

const madeFrom = () =>
  `${profileEditedAt()}|${[...loadClearedMissions()].sort().join(" ")}`;

/**
 * A pass for the account, made from its profile and missions as this
 * page has them: the account is brought up to date first if either
 * changed since the last one (a few seconds at most), so a pick or a
 * mission from a moment ago shows in the room.
 */
async function ask(): Promise<string | null> {
  const [{ fetchRoomPass }, { profileUpToDate }] = await Promise.all([
    import("./accountClient"),
    import("./profileSync"),
  ]);
  await profileUpToDate();
  const made = madeFrom();
  const got = await fetchRoomPass();
  held = got ? { ...got, made } : null;
  return held?.pass ?? null;
}

/**
 * The pass for a room's hello: the one held if it's fresh and the profile
 * and missions haven't changed since, else a new one. Null for a guest, or
 * if the account can't be reached in a few seconds: the player then joins
 * as a guest does, and plays on.
 */
export async function roomPass(
  now: number = Date.now()
): Promise<string | null> {
  if (!mayHavePass()) return null;
  if (held && held.expires - now > FRESH_MS && held.made === madeFrom()) {
    return held.pass;
  }
  asking ??= ask()
    .catch(() => null)
    .finally(() => {
      asking = null;
    });
  return Promise.race([
    asking,
    new Promise<null>((resolve) => window.setTimeout(resolve, WAIT_MS, null)),
  ]);
}

/**
 * As /multiplayer opens, signed in: the pass asked for ahead, so joining
 * doesn't wait for it. One request a visit, none for a guest.
 */
export function prepareRoomPass(): void {
  void roomPass().catch(() => {});
}

/** Signed out: the pass goes with the session. */
export function forgetRoomPass(): void {
  held = null;
}
