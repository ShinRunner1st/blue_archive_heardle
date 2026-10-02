/**
 * Which ids the admin tool may still change, and the id lock it writes.
 * "Shipped" is what ids.lock.json holds on `main`: those ids are in players'
 * saves and accounts, so they stay for good, and are only ever retired. An
 * id added since (on a branch, or in this session) has reached nobody, so
 * it can still be renamed or deleted, and the lock follows the files.
 */
import type { ContentFiles, IdsLock } from "../content/types";

/** The lists the lock keeps, each with the items whose ids it holds. */
export function lockedLists(
  files: ContentFiles
): Record<keyof IdsLock, Array<{ id: string }>> {
  const { missions, cosmetics } = files;
  return {
    missions: missions.missions,
    titles: cosmetics.titles,
    cardColors: cosmetics.cardColors,
    cursorColors: cosmetics.cursorColors,
    characters: cosmetics.characters,
    banners: cosmetics.banners,
    frames: cosmetics.frames,
    backgrounds: cosmetics.backgrounds,
  };
}

/**
 * The lock to write with the files: every shipped id, in its order, then
 * every other id the files have, in theirs. A shipped id gone from the
 * files stays in the lock, so the content check refuses the save.
 */
export function nextLock(shipped: IdsLock, files: ContentFiles): IdsLock {
  const lists = lockedLists(files);
  const lock = {} as IdsLock;
  for (const list of Object.keys(lists) as Array<keyof IdsLock>) {
    const kept = shipped[list] ?? [];
    const known = new Set(kept);
    lock[list] = [
      ...kept,
      ...lists[list].map(({ id }) => id).filter((id) => !known.has(id)),
    ];
  }
  return lock;
}

/** Whether an id has reached players, so can only be retired. */
export function isShipped(
  shipped: IdsLock,
  list: keyof IdsLock,
  id: string
): boolean {
  return (shipped[list] ?? []).includes(id);
}
