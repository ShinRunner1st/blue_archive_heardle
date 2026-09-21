import { Round } from "../types/stats";
import { isFinished } from "./calStats";

/**
 * Formats the running score as "wins/finished". The round in progress is not
 * counted until it is won or lost.
 */
export function calRecentCorrect(rounds: Round[]): string {
  const finished = rounds.filter(isFinished);
  const won = finished.filter((round) => round.didGuess);

  return `${won.length}/${finished.length}`;
}
