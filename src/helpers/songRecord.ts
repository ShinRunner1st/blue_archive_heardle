import { Round } from "../types/stats";
import { isFinished } from "./calStats";

export interface SongRecord {
  /** Finished rounds with this song, won or lost. */
  heard: number;
  /** How many of those were guessed right. */
  guessed: number;
  /** The fewest tries it took, or null if it was never guessed. */
  best: number | null;
}

/**
 * The player's history with one song, from the saved rounds of every mode. A
 * round still being played doesn't count, so the record never changes while
 * the player is guessing.
 */
export function songRecord(rounds: Round[], themeNo: string): SongRecord {
  let heard = 0;
  let guessed = 0;
  let best: number | null = null;

  for (const round of rounds) {
    if (round.solution.themeNo !== themeNo || !isFinished(round)) continue;

    heard += 1;
    if (!round.didGuess) continue;

    guessed += 1;
    // currentTry has moved past the winning guess, so it is the try count.
    const tries = Math.max(round.currentTry, 1);
    best = best === null ? tries : Math.min(best, tries);
  }

  return { heard, guessed, best };
}

/** For example "Heard 4 times · guessed 3 · best in 2 tries". */
export function songRecordText({ heard, guessed, best }: SongRecord): string {
  if (heard === 0) return "";
  if (heard === 1) return "The first time you've heard this one";

  const parts = [`Heard ${heard} times`];
  if (best === null) {
    parts.push("not guessed yet");
  } else {
    parts.push(`guessed ${guessed}`);
    parts.push(`best in ${best} ${best === 1 ? "try" : "tries"}`);
  }
  return parts.join(" · ");
}
