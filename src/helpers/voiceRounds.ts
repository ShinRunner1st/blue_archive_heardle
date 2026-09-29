import { pageUrl } from "../constants/pages";
import { students } from "../constants/students";
import { voiceOrder } from "../constants/voiceDailyOrder";
import { NO_TITLE_CALL, voiceLines } from "../constants/voiceLines";
import { voiceNeighbours } from "../constants/voiceTones";
import { GuessType } from "../types/guess";
import { Round } from "../types/stats";
import { Student } from "../types/student";
import {
  NamedRound,
  SKIPPED,
  VoiceRound,
  VoiceRoundMode,
} from "../types/voice";
import { studentById } from "./studentRounds";

/**
 * Tries in Daily and Classic: the voice alone, then a hint with each miss,
 * each hint with a try to use it. A title call is a second long and every
 * student says the same words, so hearing more wouldn't help as it does for
 * a song.
 */
export const VOICE_TRIES = 4;

/** What each miss reveals, in order. */
export const HINTS = ["school", "club", "silhouette"] as const;

export type Hint = (typeof HINTS)[number];

/**
 * Every student with a line to play, in the table's order: all of them but
 * any new student SchaleDB doesn't have the voice of yet. Each costume is its
 * own answer, as each has its own recording.
 */
export const voicePool: Student[] = students.filter(({ id }) => lineCount(id));

const inPool = new Set(voicePool.map(({ id }) => id));

/** How many lines a student has, or 0 for none. */
export function lineCount(id: number): number {
  return voiceLines[id]?.[0] ?? 0;
}

const noTitle = new Set(NO_TITLE_CALL);

/** Whether line 0 is the student's title call: all but a few have one. */
export function hasTitleCall(id: number): boolean {
  return lineCount(id) > 0 && !noTitle.has(id);
}

/** Everyone with a title call, for a time attack run of only those. */
export const titlePool: Student[] = voicePool.filter(({ id }) =>
  hasTitleCall(id)
);

/** One pick for a four-choice or time attack round, four for the rest. */
export function triesOf(round: NamedRound): number {
  return round.choices || round.run !== undefined ? 1 : VOICE_TRIES;
}

/** Saved guesses stop at the answer, so a win ends with it. */
export function isWon(round: NamedRound): boolean {
  return round.guesses[round.guesses.length - 1] === round.answer;
}

export function isOver(round: NamedRound): boolean {
  return isWon(round) || round.guesses.length >= triesOf(round);
}

/**
 * How many hints show: one per miss, up to all three, and all of them once
 * the round is over. None in the no-hint mode.
 */
export function hintsShown(round: NamedRound, withHints: boolean): number {
  if (!withHints) return 0;
  if (isOver(round)) return HINTS.length;
  return Math.min(round.guesses.length, HINTS.length);
}

/** Whether a mode gives hints: Daily and Classic do. */
export function hasHints(mode: VoiceRoundMode): boolean {
  return mode === "daily" || mode === "endless";
}

/**
 * Which line a daily puzzle plays, spread over the student's lines by the
 * day, so it's the same for every player.
 */
export function dayLine(day: number, count: number): number {
  return count > 0 ? (Math.imul(day, 2654435761) >>> 0) % count : 0;
}

/**
 * The daily puzzle, the same for every player: the student from a
 * checked-in schedule, only ever appended to (see voiceDailyOrder.ts).
 */
export function dailyVoice(day: number): { answer: number; line: number } {
  const index =
    (((day - 1) % voiceOrder.length) + voiceOrder.length) % voiceOrder.length;
  const scheduled = voiceOrder[index];

  // The scheduled student has no lines any more: this day only falls back.
  const answer = inPool.has(scheduled)
    ? scheduled
    : voicePool[index % voicePool.length].id;
  return { answer, line: dayLine(day, lineCount(answer)) };
}

type Random = () => number;

/**
 * The next endless answer, from a bag: every student comes up once before
 * any comes round again, and the last one isn't dealt straight away a second
 * time when the bag is refilled. Which of their lines plays is random, or
 * the title call when `titles` asks for only those.
 */
export function pickVoice(
  rounds: VoiceRound[],
  random: Random = Math.random,
  titles = false
): { answer: number; line: number } {
  const pool = titles ? titlePool : voicePool;
  const ids = new Set(pool.map(({ id }) => id));
  let dealt = new Set<number>();
  for (const { answer } of rounds) {
    if (ids.has(answer)) dealt.add(answer);
    if (dealt.size === ids.size) dealt = new Set();
  }

  const last = rounds[rounds.length - 1]?.answer;
  const left = pool.filter(({ id }) => !dealt.has(id) && id !== last);
  const choices = left.length > 0 ? left : pool;
  const answer = choices[Math.floor(random() * choices.length)].id;
  return {
    answer,
    line: titles ? 0 : Math.floor(random() * lineCount(answer)),
  };
}

const tablePlace = new Map(students.map(({ id }, index) => [id, index]));

/**
 * The voices nearest a student's, closest first, as measured at build time
 * (voiceTones.ts keeps them as places in the student table, two base-36
 * characters each). None for a student not measured yet.
 */
export function nearestVoices(id: number): Student[] {
  const row = voiceNeighbours[tablePlace.get(id) ?? -1] ?? "";
  const near: Student[] = [];
  for (let i = 0; i + 2 <= row.length; i += 2) {
    const student = students[parseInt(row.slice(i, i + 2), 36)];
    if (student) near.push(student);
  }
  return near;
}

/** How many answers a four-choice round offers. */
export const VOICE_CHOICES = 4;

function shuffle<T>(list: T[], random: Random): T[] {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * The four answers for a one-pick round, by id, in a random order. The wrong
 * three are dealt from the voices that sound most like the answer's (see
 * voiceTones.ts, measured at build time), so it takes an ear, not a guess
 * between very different voices; which three of the nearest varies. Each is
 * a different student: the answer's other costumes, and two costumes of one
 * student, are left out, as the same voice twice would leave a guess
 * between outfits. A student not measured yet gets two from their school
 * and the rest from anyone.
 */
export function makeVoiceChoices(
  answer: Student,
  random: Random = Math.random
): number[] {
  const others = voicePool.filter(
    ({ fullName }) => fullName !== answer.fullName
  );
  const near = nearestVoices(answer.id).filter(
    ({ id, fullName }) => inPool.has(id) && fullName !== answer.fullName
  );
  const sameSchool = shuffle(
    others.filter(({ school }) => school === answer.school),
    random
  );
  const anyone = shuffle(others, random);

  const picked: Student[] = [];
  const add = (from: Student[], upTo: number) => {
    for (const student of from) {
      if (picked.length >= upTo) return;
      if (!picked.some(({ fullName }) => fullName === student.fullName)) {
        picked.push(student);
      }
    }
  };
  add(shuffle(near, random), VOICE_CHOICES - 1);
  add(sameSchool, 2);
  add(anyone, VOICE_CHOICES - 1);

  return shuffle([answer, ...picked], random).map(({ id }) => id);
}

/**
 * Keeps the rounds of students with lines, fitting each round's line to the
 * lines there are and dropping guesses of anyone the game doesn't know. Only
 * a student or a line leaving could cause it, but a save must never break
 * the page.
 */
export function knownVoiceRounds(rounds: VoiceRound[]): VoiceRound[] {
  return rounds
    .filter((round) => inPool.has(round.answer))
    .map((round) => {
      const count = lineCount(round.answer);
      const line = round.line < count ? round.line : round.line % count;
      const guesses = round.guesses.filter(
        (id) => id === SKIPPED || studentById.has(id)
      );
      const choices =
        round.choices?.every((id) => inPool.has(id)) === false
          ? undefined
          : round.choices;
      if (
        line === round.line &&
        guesses.length === round.guesses.length &&
        choices === round.choices
      ) {
        return round;
      }
      const fitted: VoiceRound = { ...round, line, guesses };
      if (!choices) delete fitted.choices;
      return fitted;
    });
}

const NO_SONG = { artist: "", name: "", themeNo: "" };

/**
 * A voice round in the OST's shape, so the streak, calendar and character
 * helpers count it the same way: each guess or skip is a try.
 */
export function asRound(round: NamedRound): Round {
  return {
    solution: NO_SONG,
    currentTry: round.guesses.length,
    didGuess: isWon(round),
    guesses: guessesForCharacter(round),
    startTime: null,
    tries: triesOf(round),
    ...(round.day === undefined ? {} : { day: round.day }),
  };
}

/** The round's guesses as the character reads them. */
export function guessesForCharacter(round: NamedRound): GuessType[] {
  return round.guesses.map((id) => ({
    song: id === SKIPPED ? undefined : NO_SONG,
    skipped: id === SKIPPED,
    isCorrect: id === SKIPPED ? undefined : id === round.answer,
  }));
}

/**
 * Tallies finished rounds for the stats: losses at index 0, then wins by
 * the try they came on, 1 to 4 (just 1 for a four-choice round).
 */
export function voiceTally(rounds: NamedRound[], tries: number): number[] {
  const tally = Array.from({ length: tries + 1 }, () => 0);
  for (const round of rounds) {
    if (!isOver(round)) continue;
    tally[isWon(round) ? Math.min(round.guesses.length, tries) : 0] += 1;
  }
  return tally;
}

/**
 * The player's history with a student's voice, from the finished rounds of
 * every mode, for the result card: for example "Heard 4 times · named 3".
 * A round still being played doesn't count.
 */
export function voiceRecordText(rounds: VoiceRound[], id: number): string {
  let heard = 0;
  let named = 0;
  for (const round of rounds) {
    if (round.answer !== id || !isOver(round)) continue;
    heard += 1;
    if (isWon(round)) named += 1;
  }
  if (heard === 0) return "";
  if (heard === 1) return "The first time you've heard them";
  return `Heard ${heard} times · named ${named === 0 ? "never" : named}`;
}

const MODE_NAMES: Record<VoiceRoundMode, string> = {
  daily: "",
  endless: "Endless",
  nohint: "No hints",
  choice: "4-Choice",
};

/**
 * The text the result screen copies: a speaker and a square per try, as the
 * OST's, and no name, so it spoils nothing.
 */
export function buildVoiceShareText(
  mode: VoiceRoundMode,
  round: VoiceRound,
  score: string
): string {
  const squares = Array.from({ length: triesOf(round) }, (_, index) => {
    const guess = round.guesses[index];
    if (guess === undefined) return "⬜";
    if (guess === round.answer) return "🟩";
    return guess === SKIPPED ? "⬛" : "🟥";
  });

  const title =
    mode === "daily" && typeof round.day === "number"
      ? `Blue Archive Heardle · Voice #${round.day}`
      : `Blue Archive Heardle · Voice (${MODE_NAMES[mode]})`;
  const lines = [title, `🔊${squares.join("")}`];
  if (mode !== "daily") lines.push(`Score: ${score}`);
  lines.push(pageUrl("voice"));
  return lines.join("\n");
}
