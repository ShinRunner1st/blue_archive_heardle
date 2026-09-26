import {
  HOME_PLACE,
  STREAK_PLACES,
  StreakPlace,
} from "../constants/streakPlaces";
import { Round } from "../types/stats";
import { isFinished } from "./calStats";

export interface WinStreak {
  /** Endless wins in a row, up to the latest finished round. */
  current: number;
  /** The same, before the latest round: what a loss just ended. */
  before: number;
}

/** Wins in a row at the end of `finished`. */
function run(finished: Round[]): number {
  let wins = 0;
  for (let i = finished.length - 1; i >= 0 && finished[i].didGuess; i--) {
    wins += 1;
  }
  return wins;
}

/**
 * The endless win streak. The round in progress doesn't count until it is
 * over; a loss starts the count again.
 */
export function calWinStreak(rounds: Round[]): WinStreak {
  const finished = rounds.filter(isFinished);
  const latestIsOver =
    rounds.length > 0 && isFinished(rounds[rounds.length - 1]);

  return {
    current: run(finished),
    before: latestIsOver ? run(finished.slice(0, -1)) : run(finished),
  };
}

/** The place a streak has reached, or null for the default background. */
export function placeFor(wins: number): StreakPlace | null {
  let reached: StreakPlace | null = null;
  for (const place of STREAK_PLACES) {
    if (wins >= place.wins) reached = place;
  }
  return reached;
}

/** The next place to reach, or null past the last. */
export function nextPlace(wins: number): StreakPlace | null {
  return STREAK_PLACES.find((place) => place.wins > wins) ?? null;
}

/**
 * The line the result screen shows about the streak: a place just
 * unlocked, how far the next one is, or where a lost streak leaves you.
 * Null when there is nothing worth saying.
 */
export function streakNews(
  streak: WinStreak,
  didGuess: boolean
): string | null {
  if (!didGuess) {
    const lost = placeFor(streak.before);
    return lost
      ? `Your ${streak.before}-win streak is over. Back to ${HOME_PLACE}.`
      : null;
  }

  const reached = placeFor(streak.current);
  if (
    reached &&
    reached.wins === streak.current &&
    streak.before < streak.current
  ) {
    return `📍 New place unlocked: ${reached.name}!`;
  }

  const next = nextPlace(streak.current);
  if (!next) return `🔥 ${streak.current} in a row`;
  const left = next.wins - streak.current;
  return `🔥 ${streak.current} in a row · ${left} more to ${next.name}`;
}
