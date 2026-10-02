import { songs } from "../constants/songs";
import { PictureKind } from "../types/picture";
import { Server } from "../types/server";
import { Round } from "../types/stats";
import { StudentGame, StudentRound } from "../types/student";
import { NamedRound, SKIPPED } from "../types/voice";
import { dailySong } from "./daily";
import { dailyPicture } from "./pictureRounds";
import {
  emptyGuesses,
  giveUpStudent,
  guessName,
  guessPicture,
  guessSong,
  guessStudent,
  skipSong,
} from "./roundRules";
import { isFinished } from "./calStats";
import {
  dailyAnswer,
  isWon as isStudentWon,
  studentById,
} from "./studentRounds";
import { dailyVoice, isOver, isWon } from "./voiceRounds";

/*
 * The verified dailies (docs/verified-stats.md): each daily's answer on a
 * day and the judge of a player's guesses, for the page and the accounts
 * Worker alike. The answers come from the same schedules and functions the
 * games deal from, and each guess goes through the same rule the game plays
 * it with (roundRules.ts), so the server's verdict is the page's.
 *
 * Nothing here reads the browser: every daily names its server, and the
 * server's setting is never consulted.
 */

/** Every verified daily: the OST's one schedule, and each game on both servers. */
export const VERIFIED_DAILIES = [
  "ost",
  "voice.global",
  "voice.jp",
  "halo.global",
  "halo.jp",
  "weapon.global",
  "weapon.jp",
  "gameplay.global",
  "gameplay.jp",
  "lore.global",
  "lore.jp",
] as const;

export type VerifiedDaily = (typeof VERIFIED_DAILIES)[number];

export function isVerifiedDaily(value: unknown): value is VerifiedDaily {
  return VERIFIED_DAILIES.includes(value as VerifiedDaily);
}

type DailyGame = "voice" | PictureKind | StudentGame;

/** A game's daily on a server; the OST has one for both. */
export function verifiedDailyOf(
  game: "ost" | DailyGame,
  server: Server
): VerifiedDaily {
  return game === "ost" ? "ost" : (`${game}.${server}` as VerifiedDaily);
}

type Daily =
  | { family: "ost" }
  | { family: "voice"; server: Server }
  | { family: "picture"; kind: PictureKind; server: Server }
  | { family: "students"; game: StudentGame; server: Server };

function readDaily(daily: VerifiedDaily): Daily {
  if (daily === "ost") return { family: "ost" };
  const [game, server] = daily.split(".") as [DailyGame, Server];
  if (game === "voice") return { family: "voice", server };
  if (game === "halo" || game === "weapon") {
    return { family: "picture", kind: game, server };
  }
  return { family: "students", game, server };
}

/** A puzzle number: 1 on launch day, as dayNumber never goes below. */
export function isDay(day: unknown): day is number {
  return Number.isSafeInteger(day) && (day as number) >= 1;
}

/**
 * A daily's answer on a day: the OST's theme number, or the student who
 * stands for it (for a picture, the one its round is dealt as).
 */
export function verifiedAnswer(
  daily: VerifiedDaily,
  day: number
): string | number {
  const parsed = readDaily(daily);
  switch (parsed.family) {
    case "ost":
      return dailySong(day).themeNo;
    case "voice":
      return dailyVoice(day, parsed.server).answer;
    case "picture":
      return dailyPicture(parsed.kind, day, parsed.server);
    case "students":
      return dailyAnswer(parsed.game, day, parsed.server);
  }
}

/**
 * A player's moves in a daily, as its round saves them: for the OST, each
 * try's theme number or null for a skip; for the rest, student ids with
 * SKIPPED (0) for a skip; and, in Students only, whether they gave up.
 * Typed loosely, as the Worker reads them from a request.
 */
export interface DailyMoves {
  guesses: readonly unknown[];
  gaveUp?: unknown;
}

/** The moves a saved daily round holds, to send for judging. */
export function movesOf(
  daily: VerifiedDaily,
  round: Round | NamedRound | StudentRound
): DailyMoves {
  if (daily === "ost") {
    const { guesses, currentTry } = round as Round;
    return {
      guesses: guesses
        .slice(0, currentTry)
        .map((guess) => (guess.skipped ? null : guess.song?.themeNo ?? null)),
    };
  }
  const { guesses, gaveUp } = round as StudentRound;
  return readDaily(daily).family === "students"
    ? { guesses: [...guesses], gaveUp: gaveUp === true }
    : { guesses: [...guesses] };
}

export type Outcome = "won" | "lost" | "playing";

/**
 * The judge's verdict. A valid one has the outcome and the tries used (the
 * OST's and Voice's and Picture's tries with their skips, or Students'
 * guesses). An invalid one says why, and at which move:
 *
 * - `day`: not a puzzle number;
 * - `shape`: not a list of moves of the daily's kind, too long to be one,
 *   or a give-up where there's none;
 * - `ignored`: a move the game ignores and never saves (an unknown song or
 *   student, a name already guessed);
 * - `over`: a move after the round was over.
 */
export type Judgement =
  | { valid: true; outcome: Outcome; tries: number }
  | { valid: false; reason: "day" | "shape" | "ignored" | "over"; at?: number };

const songByTheme = new Map(songs.map((song) => [song.themeNo, song]));

/** The most moves any daily can take: Students has no limit but its table. */
const MOST_MOVES = studentById.size + 1;

const isId = (value: unknown): value is number =>
  Number.isSafeInteger(value) && (value as number) >= 0;

/**
 * Judges a daily's moves as the game would play them, from the day's
 * answer: each move must be one the game takes, and none may come after the
 * round is over. An unfinished round is valid, and "playing".
 */
export function judgeDaily(
  daily: VerifiedDaily,
  day: number,
  moves: DailyMoves
): Judgement {
  if (!isDay(day)) return { valid: false, reason: "day" };
  const { guesses, gaveUp } = moves;
  if (!Array.isArray(guesses) || guesses.length > MOST_MOVES) {
    return { valid: false, reason: "shape" };
  }
  const parsed = readDaily(daily);
  if (gaveUp !== undefined && gaveUp !== false) {
    if (parsed.family !== "students" || gaveUp !== true) {
      return { valid: false, reason: "shape" };
    }
  }

  switch (parsed.family) {
    case "ost":
      return judgeOst(day, guesses);
    case "voice":
    case "picture": {
      const answer = verifiedAnswer(daily, day) as number;
      return judgeNamed(guesses, { answer, guesses: [], day }, (round, id) =>
        parsed.family === "voice"
          ? guessName(round, id)
          : guessPicture(parsed.kind, round, id, parsed.server)
      );
    }
    case "students":
      return judgeStudents(
        { answer: verifiedAnswer(daily, day) as number, guesses: [], day },
        guesses,
        gaveUp === true
      );
  }
}

function judgeOst(day: number, guesses: readonly unknown[]): Judgement {
  let round: Round = {
    solution: dailySong(day),
    currentTry: 0,
    didGuess: false,
    guesses: emptyGuesses(),
    startTime: null,
    day,
  };
  for (const [at, move] of guesses.entries()) {
    if (move !== null && typeof move !== "string") {
      return { valid: false, reason: "shape", at };
    }
    if (isFinished(round)) return { valid: false, reason: "over", at };
    const song = move === null ? null : songByTheme.get(move);
    if (song === undefined) return { valid: false, reason: "ignored", at };
    const next = song === null ? skipSong(round) : guessSong(round, song);
    if (next === round) return { valid: false, reason: "ignored", at };
    round = next;
  }
  const outcome = round.didGuess
    ? "won"
    : isFinished(round)
    ? "lost"
    : "playing";
  return { valid: true, outcome, tries: round.currentTry };
}

function judgeNamed(
  guesses: readonly unknown[],
  start: NamedRound,
  play: (round: NamedRound, id: number) => NamedRound
): Judgement {
  let round = start;
  for (const [at, move] of guesses.entries()) {
    if (!isId(move)) return { valid: false, reason: "shape", at };
    if (isOver(round)) return { valid: false, reason: "over", at };
    const next = play(round, move);
    if (next === round) return { valid: false, reason: "ignored", at };
    round = next;
  }
  const outcome = isWon(round) ? "won" : isOver(round) ? "lost" : "playing";
  return { valid: true, outcome, tries: round.guesses.length };
}

function judgeStudents(
  start: StudentRound,
  guesses: readonly unknown[],
  gaveUp: boolean
): Judgement {
  let round = start;
  for (const [at, move] of guesses.entries()) {
    // Students has no skip: SKIPPED is no student.
    if (!isId(move) || move === SKIPPED) {
      return { valid: false, reason: "shape", at };
    }
    if (isStudentWon(round) || round.gaveUp) {
      return { valid: false, reason: "over", at };
    }
    const next = guessStudent(round, move);
    if (next === round) return { valid: false, reason: "ignored", at };
    round = next;
  }
  if (gaveUp) {
    const next = giveUpStudent(round);
    if (next === round) {
      return { valid: false, reason: "over", at: guesses.length };
    }
    round = next;
  }
  const outcome = isStudentWon(round)
    ? "won"
    : round.gaveUp
    ? "lost"
    : "playing";
  return { valid: true, outcome, tries: round.guesses.length };
}
