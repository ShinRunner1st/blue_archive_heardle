import { gameplayOrder, loreOrder } from "../constants/studentDailyOrder";
import { students } from "../constants/students";
import { GuessType } from "../types/guess";
import { Round } from "../types/stats";
import { Student, StudentGame, StudentRound } from "../types/student";

export const studentById = new Map(
  students.map((student) => [student.id, student])
);

/**
 * The answers each way to play deals from. Gameplay has every costume, since
 * each has its own kit; Lore has the students themselves, as a profile
 * belongs to the student rather than the outfit.
 */
const POOLS: Record<StudentGame, Student[]> = {
  gameplay: students,
  lore: students.filter((student) => student.lore),
};

const ORDERS: Record<StudentGame, number[]> = {
  gameplay: gameplayOrder,
  lore: loreOrder,
};

export function poolOf(game: StudentGame): Student[] {
  return POOLS[game];
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
export function dailyAnswer(game: StudentGame, day: number): number {
  const order = ORDERS[game];
  const pool = POOLS[game];
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
  const pool = POOLS[game];
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
  const ids = new Set(POOLS[game].map(({ id }) => id));
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
