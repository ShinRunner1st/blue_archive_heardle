/**
 * Daily gives every player the same track on the same calendar day, so a shared
 * result means something. Endless deals from a shuffled bag and never waits.
 * Four-choice ("choice") deals from its own bag too, but each song is one pick
 * from four answers. Time attack is runs of three minutes, as many songs as
 * the player can name. Each keeps its own rounds, stats and streak.
 */
export type GameMode = "daily" | "endless" | "choice" | "timeattack";

export const GAME_MODES: GameMode[] = [
  "daily",
  "endless",
  "choice",
  "timeattack",
];

/** The modes played one round at a time, which useGame runs. */
export type RoundMode = Exclude<GameMode, "timeattack">;

export const ROUND_MODES: RoundMode[] = ["daily", "endless", "choice"];

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
export const BADGE_MODES: RoundMode[] = ["daily", "endless"];

/**
 * The two games on the site: name the song, or name the student from how
 * their attributes compare (see src/components/StudentGame).
 */
export type Game = "ost" | "students";
