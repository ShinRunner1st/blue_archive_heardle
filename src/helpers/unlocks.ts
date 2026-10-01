/**
 * Who has a cosmetic or a character (docs/accounts.md, section 4): an item
 * with no mission is everyone's; the rest open with their mission, or a
 * mission that unlocked them before (`formerMissions`), so a mission
 * retired for a new one never takes away what it gave. Pure, so the rooms
 * and accounts Workers read it the same way as the page.
 */
export interface Unlockable {
  mission?: string;
  /** Retired missions that unlocked it before its `mission` did. */
  formerMissions?: string[];
  /** No longer offered: still worn by anyone who has it. */
  retired?: boolean;
}

export function unlockedBy(item: Unlockable, cleared: Iterable<string>) {
  if (item.mission === undefined) return true;
  const done = new Set(cleared);
  return (
    done.has(item.mission) ||
    (item.formerMissions ?? []).some((id) => done.has(id))
  );
}

/** Shown in a list to pick from: offered still, or already the player's. */
export function isOffered(item: Unlockable, cleared: Iterable<string>) {
  return !item.retired || unlockedBy(item, cleared);
}

/** Whether clearing a mission gives it: now, or before it was retired. */
export const unlockedWith = (item: Unlockable, missionId: string) =>
  item.mission === missionId || (item.formerMissions ?? []).includes(missionId);
