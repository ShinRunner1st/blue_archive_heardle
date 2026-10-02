import cosmetics from "../content/cosmetics.json";
import { RoomLook } from "../types/room";
import { Unlockable, unlockedBy } from "./unlocks";

/**
 * The cosmetics a player's card wears in a room (docs/accounts.md, section
 * 7): its title, banner, frame, background and name effect, by id. Read from the
 * content file itself, as the rooms and accounts Workers can't load the
 * pictures src/constants/cosmetics.ts brings along.
 */

/** Each kind's items, the first its default. */
const LISTS: Record<keyof RoomLook, ({ id: string } & Unlockable)[]> = {
  title: cosmetics.titles,
  banner: cosmetics.banners,
  frame: cosmetics.frames,
  background: cosmetics.backgrounds,
  nameEffect: cosmetics.nameEffects,
};

export const LOOK_KINDS = Object.keys(LISTS) as (keyof RoomLook)[];

/** Everyone's look before they pick anything. */
export const DEFAULT_LOOK = Object.fromEntries(
  LOOK_KINDS.map((kind) => [kind, LISTS[kind][0].id])
) as unknown as RoomLook;

/**
 * A look as a page sent it, made whole: each pick one that exists, or its
 * kind's default. A guest's is taken on trust so far (decision 1): their
 * missions are worked out in their browser, as a signed-in player's are.
 */
export function cleanLook(value: unknown): RoomLook {
  const body =
    typeof value === "object" && value !== null
      ? (value as Record<string, unknown>)
      : {};
  return Object.fromEntries(
    LOOK_KINDS.map((kind) => {
      const id = body[kind];
      return [
        kind,
        typeof id === "string" && LISTS[kind].some((item) => item.id === id)
          ? id
          : DEFAULT_LOOK[kind],
      ];
    })
  ) as unknown as RoomLook;
}

/**
 * A look with only what these missions unlock: a pick whose mission isn't
 * among them is its kind's default. What a room pass carries.
 */
export function unlockedLook(
  look: RoomLook,
  cleared: Iterable<string>
): RoomLook {
  const missions = [...cleared];
  const clean = cleanLook(look);
  return Object.fromEntries(
    LOOK_KINDS.map((kind) => {
      const item = LISTS[kind].find(({ id }) => id === clean[kind]);
      return [
        kind,
        item === undefined || unlockedBy(item, missions)
          ? clean[kind]
          : DEFAULT_LOOK[kind],
      ];
    })
  ) as unknown as RoomLook;
}
