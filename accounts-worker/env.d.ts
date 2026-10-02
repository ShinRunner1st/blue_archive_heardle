/**
 * Verified dailies use the game's own rules (src/helpers/verifiedDaily.ts),
 * and one of the modules they import reads the player's saved server from
 * localStorage, which a Worker doesn't have. It never gets there (every
 * verified daily names its server), and the read is in a try/catch, so
 * this only tells the type checker it exists, as rooms-worker/env.d.ts does.
 */
declare const localStorage: {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};
