import {
  gameplayOrder,
  gameplayOrderJp,
  loreOrder,
  loreOrderJp,
} from "../constants/studentDailyOrder";
import { students } from "../constants/students";
import { GuessType } from "../types/guess";
import { Round } from "../types/stats";
import { Server } from "../types/server";
import { Student, StudentGame, StudentRound } from "../types/student";
import { getServer } from "./server";

export const studentById = new Map(
  students.map((student) => [student.id, student])
);

/** The students out on a server: the table has both servers' in it. */
export function onServer(server: Server = getServer()): Student[] {
  return server === "jp" ? ON_JP : ON_GLOBAL;
}

const ON_GLOBAL = students.filter((student) => student.global);
const ON_JP = students.filter((student) => student.jp);

/**
 * The answers each way to play deals from, on each server. Gameplay has
 * every costume, since each has its own kit; Lore has the students
 * themselves, as a profile belongs to the student rather than the outfit.
 */
const POOLS: Record<Server, Record<StudentGame, Student[]>> = {
  global: {
    gameplay: ON_GLOBAL,
    lore: ON_GLOBAL.filter((student) => student.lore),
  },
  jp: {
    gameplay: ON_JP,
    lore: ON_JP.filter((student) => student.lore),
  },
};

const ORDERS: Record<Server, Record<StudentGame, number[]>> = {
  global: { gameplay: gameplayOrder, lore: loreOrder },
  jp: { gameplay: gameplayOrderJp, lore: loreOrderJp },
};

/** A way to play's answers, on the server the games follow now. */
export function poolOf(
  game: StudentGame,
  server: Server = getServer()
): Student[] {
  return POOLS[server][game];
}

/** Saved guesses stop at the answer, so a win ends with it. */
export function isWon(round: StudentRound): boolean {
  return round.guesses[round.guesses.length - 1] === round.answer;
}

export function isOver(round: StudentRound): boolean {
  return isWon(round) || round.gaveUp === true;
}

/**
 * The answer to a daily puzzle, the same for every player. It is read from a
 * checked-in schedule, only ever appended to, like the OST's (see
 * dailySong), so a new student can't change a day already played.
 */
export function dailyAnswer(
  game: StudentGame,
  day: number,
  server: Server = getServer()
): number {
  const order = ORDERS[server][game];
  const pool = POOLS[server][game];
  const index = (((day - 1) % order.length) + order.length) % order.length;
  const id = order[index];
  if (pool.some((student) => student.id === id)) return id;

  // The scheduled student has left the table: this day only falls back.
  return pool[index % pool.length].id;
}

/**
 * The next endless answer, from a bag: every student comes up once before
 * any comes round again. When the bag is refilled, the last answer isn't
 * dealt straight away a second time.
 */
export function pickAnswer(
  game: StudentGame,
  rounds: StudentRound[],
  random: () => number = Math.random
): number {
  const pool = poolOf(game);
  const ids = new Set(pool.map(({ id }) => id));

  let dealt = new Set<number>();
  for (const { answer } of rounds) {
    if (ids.has(answer)) dealt.add(answer);
    if (dealt.size === ids.size) dealt = new Set();
  }

  // The last answer is dealt already, unless the bag has just been refilled.
  const last = rounds[rounds.length - 1]?.answer;
  const left = pool.filter(({ id }) => !dealt.has(id) && id !== last);
  const choices = left.length > 0 ? left : pool;
  return choices[Math.floor(random() * choices.length)].id;
}

/**
 * Keeps the rounds of students the game knows, dropping guesses of any it
 * doesn't. Only a student leaving the table could cause it, but a save must
 * never break the page.
 */
export function knownRounds(
  game: StudentGame,
  rounds: StudentRound[]
): StudentRound[] {
  const ids = new Set(poolOf(game).map(({ id }) => id));
  return rounds
    .filter((round) => ids.has(round.answer))
    .map((round) => {
      const guesses = round.guesses.filter((id) => studentById.has(id));
      return guesses.length === round.guesses.length
        ? round
        : { ...round, guesses };
    });
}

const NO_SONG = { artist: "", name: "", themeNo: "" };

/**
 * A student round in the OST's shape, so the streak, calendar and character
 * helpers count it the same way: each guess is a try, and a finished round
 * has no tries left.
 */
export function asRound(round: StudentRound): Round {
  const over = isOver(round);
  return {
    solution: NO_SONG,
    currentTry: over ? Math.max(round.guesses.length, 1) : 0,
    didGuess: isWon(round),
    guesses: [],
    startTime: null,
    tries: 1,
    ...(round.day === undefined ? {} : { day: round.day }),
  };
}

/** The round's guesses as the character reads them: each right or wrong. */
export function guessesForCharacter(round: StudentRound): GuessType[] {
  return round.guesses.map((id) => ({
    song: NO_SONG,
    skipped: false,
    isCorrect: id === round.answer,
  }));
}

/**
 * Tallies finished rounds for the stats: gave up at index 0, then wins by
 * guess count, 1 to 9, and 10 or more together.
 */
export function studentTally(rounds: StudentRound[]): number[] {
  const tally = Array.from({ length: 11 }, () => 0);
  for (const round of rounds) {
    if (!isOver(round)) continue;
    tally[isWon(round) ? Math.min(round.guesses.length, 10) : 0] += 1;
  }
  return tally;
}

/** The finds that were timed: rounds from before the clock have no time. */
function timedWins(rounds: StudentRound[]): number[] {
  return rounds
    .filter((round) => isWon(round) && typeof round.time === "number")
    .map((round) => round.time!);
}

/** The quickest find in milliseconds, or null before the first timed one. */
export function fastestTime(rounds: StudentRound[]): number | null {
  const times = timedWins(rounds);
  return times.length > 0 ? Math.min(...times) : null;
}

/** The average find in milliseconds, or null before the first timed one. */
export function averageTime(rounds: StudentRound[]): number | null {
  const times = timedWins(rounds);
  if (times.length === 0) return null;
  return Math.round(times.reduce((sum, time) => sum + time, 0) / times.length);
}

/** The round's time as the result shows it, or "" for an untimed round. */
export function roundTime(round: StudentRound): string {
  return typeof round.time === "number" ? formatSolveTime(round.time) : "";
}

/**
 * A stopwatch reading: m:ss, or h:mm:ss past an hour. Rounded down, so it
 * never shows a second not yet gone by.
 */
export function formatSolveTime(ms: number): string {
  const seconds = Math.floor(Math.max(ms, 0) / 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor(seconds / 60) % 60;
  return hours > 0
    ? `${hours}:${pad(minutes)}:${pad(seconds % 60)}`
    : `${minutes}:${pad(seconds % 60)}`;
}
