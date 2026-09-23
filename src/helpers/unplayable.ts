/**
 * Tracks songs the player has proven unplayable in this session - a missing
 * file, or one this browser cannot decode.
 *
 * CI checks that every file exists, but not that every browser can play it. So
 * the running app records its own failures and stops dealing them out again.
 * Session-scoped on purpose: the next visit re-tests, since a failure can be a
 * one-off network problem.
 */
const unplayable = new Set<string>();

export function markUnplayable(themeNo: string): void {
  unplayable.add(themeNo);
}

export function isUnplayable(themeNo: string): boolean {
  return unplayable.has(themeNo);
}

/** Test seam - the set is module state that would otherwise leak across tests. */
export function clearUnplayable(): void {
  unplayable.clear();
}
