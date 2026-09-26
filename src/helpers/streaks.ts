import { Round } from "../types/stats";
import { isFinished } from "./calStats";

export interface Streaks {
  current: number;
  max: number;
}

/**
 * Counts consecutive daily wins. `today` anchors the current streak: a run that
 * ends yesterday is still alive because today's puzzle has not been played yet,
 * but one that ends the day before that is broken - and so is one whose
 * today's puzzle was lost.
 */
export function calStreaks(rounds: Round[], today: number): Streaks {
  const wins = new Set(
    rounds
      .filter((round) => round.didGuess && typeof round.day === "number")
      .map((round) => round.day as number)
  );

  let max = 0;
  let run = 0;
  let previous: number | null = null;

  [...wins]
    .sort((a, b) => a - b)
    .forEach((day) => {
      run = previous !== null && day === previous + 1 ? run + 1 : 1;
      previous = day;
      if (run > max) max = run;
    });

  const lostToday = rounds.some(
    (round) => round.day === today && isFinished(round) && !round.didGuess
  );
  let day = wins.has(today) ? today : today - 1;
  let current = 0;

  while (!lostToday && wins.has(day)) {
    current += 1;
    day -= 1;
  }

  return { current, max };
}
