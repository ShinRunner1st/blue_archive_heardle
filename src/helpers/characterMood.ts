import { MAX_TRIES } from "../constants/game";

/**
 * Which expression (a Spine animation name) a character wears in each
 * situation of a round.
 */
export interface Moods {
  idle: string;
  /** While the clip plays. */
  listening: string;
  /** A moment's reaction to a wrong guess. */
  wrong: string;
  /** After 1, 2, 3... tries used without the answer. */
  nervous: string[];
  /** Winning on try 1, 2, 3... */
  won: string[];
  lost: string;
  /** Picked from at random when she is tapped. */
  tapped: string[];
}

export interface MoodState {
  currentTry: number;
  /** The round's tries: six, or one for a four-choice round. */
  tries?: number;
  didGuess: boolean;
  playing: boolean;
  /** Just guessed wrong. */
  reacting: boolean;
}

/** The entry for `index`, or the nearest end of the list past either end. */
function at(list: string[], index: number): string {
  return list[Math.min(Math.max(index, 0), list.length - 1)];
}

/** The expression that fits the round as it stands. */
export function pickExpression(moods: Moods, state: MoodState): string {
  if (state.didGuess) return at(moods.won, state.currentTry - 1);
  if (state.currentTry >= (state.tries ?? MAX_TRIES)) return moods.lost;
  if (state.reacting) return moods.wrong;
  if (state.playing) return moods.listening;
  if (state.currentTry === 0) return moods.idle;
  return at(moods.nervous, state.currentTry - 1);
}
