import { PICTURE_KINDS } from "../types/picture";
import { Game } from "../types/mode";
import { Server } from "../types/server";
import { Round } from "../types/stats";
import { StudentGame, StudentRound } from "../types/student";
import { isFinished, triesOf } from "./calStats";
import { dayNumber } from "./daily";
import { getServer } from "./server";
import {
  loadPictureRounds,
  loadRounds,
  loadStudentRounds,
  loadVoiceRounds,
} from "./storage";
import { isOver, isWon } from "./studentRounds";
import { asRound as namedAsRound } from "./voiceRounds";

export type DailyState = "unplayed" | "playing" | "won" | "lost";

/** How today's daily puzzle went, for a game's card on the hub. */
export interface DailyResult {
  /** Which puzzle, where a game has two: Gameplay and Lore, Halo and Weapon. */
  label?: string;
  state: DailyState;
  /** Tries or guesses used, once it is won. */
  used?: number;
  /** The tries it has; none in the student game, which has no limit. */
  tries?: number;
}

const STUDENT_WAYS: Array<[StudentGame, string]> = [
  ["gameplay", "Gameplay"],
  ["lore", "Lore"],
];

function fromRound(round: Round | undefined, label?: string): DailyResult {
  const named = label === undefined ? {} : { label };
  if (!round || round.currentTry === 0) return { ...named, state: "unplayed" };
  if (!isFinished(round)) return { ...named, state: "playing" };
  return round.didGuess
    ? { ...named, state: "won", used: round.currentTry, tries: triesOf(round) }
    : { ...named, state: "lost" };
}

function fromStudentRound(
  round: StudentRound | undefined,
  label: string
): DailyResult {
  if (!round || round.guesses.length === 0) return { label, state: "unplayed" };
  if (!isOver(round)) return { label, state: "playing" };
  return isWon(round)
    ? { label, state: "won", used: round.guesses.length }
    : { label, state: "lost" };
}

/**
 * Today's daily puzzle in every game, read from the saves as they are now:
 * the hub holds no game's state, and reads them afresh each time it shows.
 */
export function todayResults(
  today: number = dayNumber(),
  server: Server = getServer()
): Record<Game, DailyResult[]> {
  const isToday = (round: { day?: number }) => round.day === today;

  return {
    ost: [fromRound(loadRounds("daily").find(isToday))],
    voice: [
      fromRound(
        loadVoiceRounds("daily", server)
          .filter(isToday)
          .map(namedAsRound)
          .at(-1)
      ),
    ],
    students: STUDENT_WAYS.map(([way, label]) =>
      fromStudentRound(
        loadStudentRounds(`${way}-daily`, server).filter(isToday).at(-1),
        label
      )
    ),
    picture: PICTURE_KINDS.map((kind) =>
      fromRound(
        loadPictureRounds(`${kind}-daily`, server)
          .filter(isToday)
          .map(namedAsRound)
          .at(-1),
        kind === "halo" ? "Halo" : "Weapon"
      )
    ),
  };
}
