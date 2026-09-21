/**
 * Daily gives every player the same track on the same calendar day, so a shared
 * result means something. Endless deals from a shuffled bag and never waits.
 */
export type GameMode = "daily" | "endless";

export const GAME_MODES: GameMode[] = ["daily", "endless"];

export function isGameMode(value: unknown): value is GameMode {
  return value === "daily" || value === "endless";
}
