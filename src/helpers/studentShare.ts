import { pageUrl } from "../constants/pages";
import {
  Student,
  StudentGame,
  StudentMode,
  StudentRound,
} from "../types/student";
import { compareStudents, Verdict } from "./studentClues";
import { isWon, roundTime, studentById } from "./studentRounds";
import { serverSuffix } from "./server";

const SQUARES: Record<Verdict, string> = {
  right: "🟩",
  close: "🟨",
  wrong: "🟥",
};

/** Past this many guesses, the middle ones are left out of the text. */
const MAX_ROWS = 8;

const GAME_NAMES: Record<StudentGame, string> = {
  gameplay: "Gameplay",
  lore: "Lore",
};

interface ShareInput {
  game: StudentGame;
  mode: StudentMode;
  round: StudentRound;
  answer: Student;
  /** The "found/played" tally, shown in endless. */
  score: string;
}

/**
 * The text the result screen copies: a row of squares per guess, oldest
 * first, and no names, so it spoils nothing for a player who hasn't found
 * today's student yet.
 */
export function buildStudentShareText({
  game,
  mode,
  round,
  answer,
  score,
}: ShareInput): string {
  const rows = round.guesses.flatMap((id) => {
    const guess = studentById.get(id);
    if (!guess) return [];
    return [
      compareStudents(guess, answer, game)
        .map(({ verdict }) => SQUARES[verdict])
        .join(""),
    ];
  });

  // A long hunt keeps its start and its end.
  const shown =
    rows.length > MAX_ROWS
      ? [
          ...rows.slice(0, MAX_ROWS - 2),
          `… ${rows.length - (MAX_ROWS - 1)} more`,
          rows[rows.length - 1],
        ]
      : rows;

  const name = `Blue Archive Heardle · Students (${
    GAME_NAMES[game]
  })${serverSuffix()}`;
  const count = round.guesses.length;
  const time = roundTime(round);
  const lines = [
    mode === "daily" && typeof round.day === "number"
      ? `${name} #${round.day}`
      : name,
    ...shown,
    (isWon(round)
      ? `Found in ${count} ${count === 1 ? "guess" : "guesses"}`
      : `Gave up after ${count} ${count === 1 ? "guess" : "guesses"}`) +
      (time ? ` · ⏱️ ${time}` : ""),
  ];
  if (mode === "endless") lines.push(`Score: ${score}`);
  lines.push(pageUrl("students"));

  return lines.join("\n");
}
