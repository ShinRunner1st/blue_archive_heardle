import { MAX_TRIES } from "../constants/game";
import { Round, StatsTally } from "../types/stats";

/** How many tries the round has: six, or one for a four-choice round. */
export function triesOf(round: Round): number {
  return round.tries ?? MAX_TRIES;
}

export function isFinished(round: Round): boolean {
  return round.didGuess || round.currentTry >= triesOf(round);
}

/**
 * Tallies finished rounds into [losses, win@1 ... win@6, total]. The round in
 * progress is skipped so it can't inflate the denominator of the stats bars.
 */
export function calStats(rounds: Round[]): StatsTally {
  const tally: StatsTally = [0, 0, 0, 0, 0, 0, 0, 0];

  rounds.forEach((round) => {
    if (!isFinished(round)) return;

    if (round.didGuess) {
      // currentTry has already been incremented past the winning guess, so it
      // doubles as the "solved in N" bucket.
      const bucket = Math.min(Math.max(round.currentTry, 1), MAX_TRIES);
      tally[bucket] += 1;
    } else {
      tally[0] += 1;
    }

    tally[7] += 1;
  });

  return tally;
}
