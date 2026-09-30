/**
 * The room imports the game's own helpers, and one of them reads the
 * player's saved server from localStorage, which a Worker doesn't have. It
 * never gets there (a room names its server), and the read is in a
 * try/catch, so this only tells the type checker it exists.
 */
declare const localStorage: {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};
