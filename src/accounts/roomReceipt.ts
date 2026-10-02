import { PICTURE_KINDS } from "../types/picture";
import { MAX_PLAYERS, MIN_PLAYERS, ROUND_RANGE } from "../types/room";
import { ROOM_RECEIPT_MS } from "../types/verified";
import { randomBase32, readSigned, signValue } from "./crypto";

/**
 * A room's receipt for one signed-in player's result (docs/verified-stats.md,
 * section 8). The room is the judge of a game and never writes to D1: as
 * a game reaches its standings, it signs each signed-in player's result
 * with ROOM_PASS_KEY (shared with the accounts Worker) and sends it on that
 * player's connection only; their page brings it here. This is the
 * receipt's format, its signing and its checks, with nothing of D1, as
 * the rooms Worker bundles it; verified.ts keeps a checked one.
 *
 * A valid signature is never enough: the receipt must be for the account
 * signed in, not expired, in range, and new.
 */

/** Keeps a receipt from passing for a room pass, a sign-in or a link ticket. */
const KIND = "room-result";

/** The games a room plays, its picture game by kind. */
export const RECEIPT_GAMES = ["ost", "voice", ...PICTURE_KINDS] as const;
export type ReceiptGame = (typeof RECEIPT_GAMES)[number];

export interface RoomReceipt {
  /** The room's random id for the game: 128 bits, base32. */
  gameId: string;
  /** The account's public id, from the room pass its player joined with. */
  publicId: string;
  game: ReceiptGame;
  answers: "typed" | "choice";
  rounds: number;
  players: number;
  /** 1 is first; ties share a place. */
  place: number;
  score: number;
  /** When the game ended, on the room's clock. */
  endedAt: number;
}

/** A new game's id, which the room keeps with the game. */
export const newRoomGameId = () => randomBase32(16);

const GAME_ID = /^[a-z2-7]{26}$/;
const PUBLIC_ID = /^[a-z2-7]{16}$/;

/** A room's clock may run a little ahead of this Worker's. */
const SKEW_MS = 5 * 60_000;

/** Signs a player's result, good for ROOM_RECEIPT_MS after the game ended. */
export function makeRoomReceipt(
  receipt: RoomReceipt,
  key: string
): Promise<string> {
  return signValue(
    KIND,
    {
      g: receipt.gameId,
      p: receipt.publicId,
      k: receipt.game,
      a: receipt.answers,
      r: receipt.rounds,
      n: receipt.players,
      o: receipt.place,
      s: receipt.score,
      t: receipt.endedAt,
      e: receipt.endedAt + ROOM_RECEIPT_MS,
    },
    key
  );
}

const whole = (value: unknown, min: number, max: number): value is number =>
  Number.isSafeInteger(value) &&
  (value as number) >= min &&
  (value as number) <= max;

/**
 * A receipt back, or null if it isn't one: changed, signed for another
 * kind or with another key, expired, from the future, or out of range.
 */
export async function readRoomReceipt(
  token: unknown,
  key: string,
  now: number
): Promise<RoomReceipt | null> {
  if (typeof token !== "string" || token.length > 1024) return null;
  const value = await readSigned(KIND, token, key);
  if (!value) return null;
  const { g, p, k, a, r, n, o, s, t, e } = value;
  if (
    typeof g !== "string" ||
    !GAME_ID.test(g) ||
    typeof p !== "string" ||
    !PUBLIC_ID.test(p) ||
    !RECEIPT_GAMES.includes(k as ReceiptGame) ||
    (a !== "typed" && a !== "choice") ||
    !whole(r, ROUND_RANGE.min, ROUND_RANGE.max) ||
    !whole(n, MIN_PLAYERS, MAX_PLAYERS) ||
    !whole(o, 1, n as number) ||
    !whole(s, 0, r as number) ||
    !whole(t, 1, now + SKEW_MS) ||
    e !== (t as number) + ROOM_RECEIPT_MS ||
    (e as number) < now
  ) {
    return null;
  }
  return {
    gameId: g,
    publicId: p,
    game: k as ReceiptGame,
    answers: a,
    rounds: r as number,
    players: n as number,
    place: o as number,
    score: s as number,
    endedAt: t as number,
  };
}
