/**
 * Voice mode's ways to play, which mirror the OST's: daily, Classic, 4-Choice
 * and time attack, and Classic with no hints. Each keeps its own rounds,
 * stats and streak.
 */
export type VoiceMode =
  | "daily"
  | "endless"
  | "nohint"
  | "choice"
  | "timeattack";

/** The modes played one round at a time, which useVoiceGame runs. */
export type VoiceRoundMode = Exclude<VoiceMode, "timeattack">;

export const VOICE_ROUND_MODES: VoiceRoundMode[] = [
  "daily",
  "endless",
  "nohint",
  "choice",
];

export const VOICE_MODES: VoiceMode[] = [...VOICE_ROUND_MODES, "timeattack"];

/** The ways to play under the header's Endless button. */
export type VoiceStyle = Exclude<VoiceMode, "daily">;

export const VOICE_STYLES: VoiceStyle[] = [
  "endless",
  "nohint",
  "choice",
  "timeattack",
];

export function isVoiceStyle(value: unknown): value is VoiceStyle {
  return VOICE_STYLES.includes(value as VoiceStyle);
}

/** Stands for a skipped try among a round's guesses: no student has id 0. */
export const SKIPPED = 0;

/**
 * A round with one student to name and a few tries, the shape Voice mode and
 * the picture game share, so they share the helpers that count them too.
 * The last round in a saved list is always the one in progress, as in the
 * other games.
 */
export interface NamedRound {
  /** The answer's student id. */
  answer: number;
  /** The ids guessed, in order, SKIPPED for a skip; the answer last once found. */
  guesses: number[];
  /** Which daily puzzle the round belongs to; daily rounds only. */
  day?: number;
  /**
   * The four answers offered, by id, answer included, for a round with one
   * pick. Saved with the round so a reload can't deal a different four.
   */
  choices?: number[];
  /** Which time attack run the round was part of: when the run started. */
  run?: number;
}

/** One voice line to name. */
export interface VoiceRound extends NamedRound {
  /** Which of their lines plays: 0 is the title call, when they have one. */
  line: number;
  /** A time attack run of title calls only, the same words from everyone. */
  titles?: true;
}
