import { RoundStamp } from "../types/roundStamp";

/**
 * Every round has an id, so two copies of the same progress (two devices, a
 * save file, an account later) can be put together without counting a round
 * twice or losing one (see saveMerge.ts and docs/accounts.md). New rounds
 * get a random one, and when they were dealt; rounds from before ids get one
 * made from where they are and what they hold, so the same old rounds get
 * the same ids on every device.
 */

export type { RoundStamp };

/**
 * 48 bits: ids only need to differ within one list of rounds, and two in
 * even 5,000 rounds would match about once in 20 million lists. Random
 * digits don't compress, so each costs about 9 bytes in a gzipped save,
 * where 64 bits cost 12: the developer's save of every mode (4,300 rounds)
 * is 66 KB gzipped, in place of 77, and 25 KB without ids at all.
 */
const ROUND_ID = /^(?:[0-9a-f]{12}|l[0-9a-f]{11})$/;

export const isRoundId = (value: unknown): value is string =>
  typeof value === "string" && ROUND_ID.test(value);

/** 6 random bytes as hex. */
export function newRoundId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    ""
  );
}

/** A newly dealt round, with its id and the time. */
export function stamped<T extends object>(
  round: T,
  now: number = Date.now()
): T & Required<RoundStamp> {
  return { ...round, id: newRoundId(), at: now };
}

/** A round without its id and time: what it holds of its game. */
export function withoutStamp<T extends object>(
  round: T
): Omit<T, keyof RoundStamp> {
  const rest = { ...round } as T & RoundStamp;
  delete rest.id;
  delete rest.at;
  return rest;
}

/** FNV-1a, 32 bits, from a given start, over the text's UTF-16 units. */
function fnv(text: string, start: number): number {
  let hash = start;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash;
}

/**
 * The id of a round from before ids: from its slot ("ost:endless",
 * "jp:voices:daily"), its place in it and what it holds, without any id or
 * time. Not secret, only stable: the same round in the same place gives the
 * same id in a save file and in the browser it came from.
 */
export function legacyRoundId(
  slot: string,
  index: number,
  round: object
): string {
  const text = `${slot}|${index}|${JSON.stringify(withoutStamp(round))}`;
  const high = fnv(text, 0x811c9dc5).toString(16).padStart(8, "0");
  const low = fnv(text, 0x050c5d1f).toString(16).padStart(8, "0");
  return `l${high}${low}`.slice(0, 12);
}

/** The rounds of a slot, each with an id: kept where there is one. */
export function withRoundIds<T extends RoundStamp>(
  slot: string,
  rounds: T[]
): T[] {
  return rounds.map((round, index) =>
    isRoundId(round.id)
      ? round
      : { ...round, id: legacyRoundId(slot, index, round) }
  );
}

/** Whether any round of a slot is still without an id. */
export const lacksIds = (rounds: RoundStamp[]): boolean =>
  rounds.some((round) => !isRoundId(round.id));
