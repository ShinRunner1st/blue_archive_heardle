import {
  HOME_PLACE,
  STREAK_PLACES,
  StreakPlace,
} from "../constants/streakPlaces";
import { Round } from "../types/stats";
import { isFinished } from "./calStats";
import { calStreaks } from "./streaks";

/**
 * A run of wins that moves the background: endless wins in a row, or the
 * daily puzzle's day streak. Each mode keeps its own.
 */
export interface WinStreak {
  /** Wins in a row, up to the latest finished round. */
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

/** The longest endless run of wins in a row, for the recap. */
export function bestWinStreak(rounds: Round[]): number {
  let best = 0;
  let wins = 0;
  for (const round of rounds.filter(isFinished)) {
    wins = round.didGuess ? wins + 1 : 0;
    best = Math.max(best, wins);
  }
  return best;
}

/**
 * The daily day streak, as a WinStreak: the same count as the header's and the
 * stats', and what today's round did to it.
 */
export function calDayStreak(rounds: Round[], today: number): WinStreak {
  const { current } = calStreaks(rounds, today);
  const played = rounds.find((round) => round.day === today);
  if (!played || !isFinished(played)) return { current, before: current };
  if (played.didGuess) return { current, before: current - 1 };
  // Lost today: the run it ended is the one up to yesterday.
  const lost = calStreaks(
    rounds.filter((round) => round.day !== today),
    today
  ).current;
  return { current: 0, before: lost };
}

/** The place a streak has reached, or null for the default background. */
export function placeFor(wins: number): StreakPlace | null {
  let reached: StreakPlace | null = null;
  for (const place of STREAK_PLACES) {
    if (wins >= place.wins) reached = place;
  }
  return reached;
}

/**
 * The line the result screen shows about the streak: a place the moment it
 * is reached, or where a lost streak leaves you: `home`, which a season can
 * change. Nothing otherwise - what
 * comes next, and when, stays a surprise.
 */
export function streakNews(
  streak: WinStreak,
  didGuess: boolean,
  unit: "win" | "day",
  home: string = HOME_PLACE
): string | null {
  if (!didGuess) {
    return placeFor(streak.before)
      ? `Your ${streak.before}-${unit} streak is over. Back to ${home}.`
      : null;
  }
  const reached = placeFor(streak.current);
  const justNow =
    reached &&
    reached.wins === streak.current &&
    streak.before < streak.current;
  return justNow ? `📍 New place unlocked: ${reached.name}!` : null;
}
