/**
 * Daily gives every player the same track on the same calendar day, so a shared
 * result means something. Endless deals from a shuffled bag and never waits.
 * Four-choice ("choice") deals from its own bag too, but each song is one pick
 * from four answers. Each keeps its own rounds, stats and streak.
 */
export type GameMode = "daily" | "endless" | "choice";

export const GAME_MODES: GameMode[] = ["daily", "endless", "choice"];

export function isGameMode(value: unknown): value is GameMode {
  return GAME_MODES.includes(value as GameMode);
}

/**
 * The ways to play under the header's Endless button, which the switch below
 * the header picks between. Everything but the daily puzzle.
 */
export function isEndlessStyle(mode: GameMode): boolean {
  return mode !== "daily";
}

/** Modes whose rounds count towards the OST badges: typed answers only. */
export const BADGE_MODES: GameMode[] = ["daily", "endless"];
