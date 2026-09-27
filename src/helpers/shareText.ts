import { SITE_URL } from "../constants/game";
import { GameMode } from "../types/mode";
import { Round } from "../types/stats";
import { triesOf } from "./calStats";

const CORRECT = "🟩";
const WRONG = "🟥";
const SKIPPED = "⬛";
const UNUSED = "⬜";

/**
 * Renders one round as the familiar Heardle strip: a speaker, then a square per
 * try. Tries that were never needed stay blank, so the length of the coloured
 * run is the score.
 */
function pattern(round: Round): string {
  const squares = Array.from({ length: triesOf(round) }, (_, index) => {
    const guess = round.guesses[index];

    if (index >= round.currentTry) return UNUSED;
    if (guess?.isCorrect) return CORRECT;
    if (guess?.skipped) return SKIPPED;
    return WRONG;
  });

  return `🔈${squares.join("")}`;
}

interface ShareInput {
  mode: GameMode;
  round: Round;
  /** Running "wins/played" tally, shown for the bag modes only. */
  score: string;
}

/**
 * Builds the text copied by the result screen. It describes the round just
 * played rather than a lifetime tally: the tally lives in the stats pop-up, and
 * pasting it into a chat told nobody anything about the song.
 */
export function buildShareText({ mode, round, score }: ShareInput): string {
  const lines: string[] = [];

  if (mode === "daily" && typeof round.day === "number") {
    lines.push(`Blue Archive Heardle #${round.day}`);
  } else {
    lines.push(
      `Blue Archive Heardle (${mode === "choice" ? "4-Choice" : "Endless"})`
    );
  }

  lines.push(pattern(round));

  if (mode !== "daily") lines.push(`Score: ${score}`);

  lines.push(SITE_URL);

  return lines.join("\n");
}
