/**
 * Tracks videos the player has proven unplayable in this session - deleted,
 * private, region-blocked, or with embedding turned off.
 *
 * The weekly link check in CI can only see what a GitHub runner sees: a video
 * that resolves there may still refuse to embed, or be blocked in the player's
 * country. So the running app records its own failures and stops dealing them
 * out again. Session-scoped on purpose: the next visit re-tests, since a block
 * can be temporary or specific to one network.
 */
const unplayable = new Set<string>();

export function markUnplayable(youtubeId: string): void {
  unplayable.add(youtubeId);
}

export function isUnplayable(youtubeId: string): boolean {
  return unplayable.has(youtubeId);
}

/** Test seam - the set is module state that would otherwise leak across tests. */
export function clearUnplayable(): void {
  unplayable.clear();
}
