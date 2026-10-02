/**
 * Which ids the admin tool may still change, and the id lock it writes.
 * "Shipped" is what ids.lock.json holds on `main`: those ids are in players'
 * saves and accounts, so they stay for good, and are only ever retired. An
 * id added since (on a branch, or in this session) has reached nobody, so
 * it can still be renamed or deleted, and the lock follows the files.
 */
import type { ContentFiles, IdsLock, LockList } from "../content/types";

/** The lists the lock keeps, each with the items whose ids it holds. */
export function lockedLists(
  files: ContentFiles
): Record<LockList, Array<{ id: string }>> {
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
 * files stays in the lock, so the content check refuses the save, unless
 * the lock lists it as withdrawn (see readShipped).
 */
export function nextLock(shipped: IdsLock, files: ContentFiles): IdsLock {
  const lists = lockedLists(files);
  const lock = {} as IdsLock;
  for (const list of Object.keys(lists) as LockList[]) {
    const kept = shipped[list] ?? [];
    const known = new Set(kept);
    lock[list] = [
      ...kept,
      ...lists[list].map(({ id }) => id).filter((id) => !known.has(id)),
    ];
  }
  const withdrawn = files.idsLock?.withdrawn;
  if (withdrawn) lock.withdrawn = withdrawn;
  return lock;
}

/**
 * What `main` released, less the ids this branch's lock withdraws: taken
 * back before anyone had them, they're no longer the tool's to keep.
 */
export function withoutWithdrawn(released: IdsLock, current: IdsLock): IdsLock {
  const shipped = { ...released };
  for (const [list, ids] of Object.entries(current.withdrawn ?? {})) {
    const gone = new Set(ids);
    shipped[list as LockList] = (released[list as LockList] ?? []).filter(
      (id) => !gone.has(id)
    );
  }
  return shipped;
}

/** Whether an id has reached players, so can only be retired. */
export function isShipped(
  shipped: IdsLock,
  list: LockList,
  id: string
): boolean {
  return (shipped[list] ?? []).includes(id);
}
