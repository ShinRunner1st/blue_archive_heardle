import { GuessType } from "./guess";
import { Song } from "./song";

/**
 * One playthrough of a single song. The last entry in the persisted array is
 * always the round currently in progress.
 */
export type Round = {
  solution: Song;
  currentTry: number;
  didGuess: boolean;
  guesses: GuessType[];
  /** Clip start in seconds; null until the player has rolled one. */
  startTime: number | null;
  /**
   * Which daily puzzle this round belongs to. Set on daily rounds only, so an
   * endless round can never be mistaken for today's.
   */
  day?: number;
  /**
   * How many tries the round has, when not the usual six: four-choice rounds
   * have one.
   */
  tries?: number;
  /**
   * The four answers offered, as theme numbers, answer included. Saved with
   * the round so a reload can't deal a different four: comparing the two
   * would narrow the answer down.
   */
  choices?: string[];
  /** Seconds of the clip a round with one try plays; six tries use playTimes. */
  clip?: number;
};

/** Index 0 holds losses, 1-6 hold wins by try count, 7 holds the round total. */
export type StatsTally = [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number
];
