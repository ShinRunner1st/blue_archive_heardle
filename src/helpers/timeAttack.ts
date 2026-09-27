import { playTimes } from "../constants";
import { SITE_URL, TIME_ATTACK_SETTINGS_KEY } from "../constants/game";
import { Round } from "../types/stats";
import { Song } from "../types/song";
import { makeChoices } from "./choices";
import { pickSong } from "./pickSong";
import { emptyGuesses } from "./storage";

/** How long a run lasts, in milliseconds. */
export const TIME_ATTACK_MS = 3 * 60 * 1000;

/** The clip lengths a run can be played with, in seconds. */
export const CLIP_OPTIONS = [1, 2, 4, 7];

/** The clip file's length: a random start stays inside it. */
const CLIP_FILE_SECONDS = playTimes[playTimes.length - 1] / 1000;

export type Answers = "typed" | "choice";

export interface TimeAttackSettings {
  /** How much of the clip each song plays, in seconds. */
  clip: number;
  /** Start each clip somewhere random within the clip file, not at its top. */
  randomStart: boolean;
  answers: Answers;
}

export const DEFAULT_SETTINGS: TimeAttackSettings = {
  clip: 2,
  randomStart: false,
  answers: "choice",
};

/** The settings picked last, or the defaults. Bad values fall back one by one. */
export function loadSettings(): TimeAttackSettings {
  let parsed: Record<string, unknown> = {};
  try {
    const raw = localStorage.getItem(TIME_ATTACK_SETTINGS_KEY);
    const value: unknown = raw ? JSON.parse(raw) : {};
    if (typeof value === "object" && value !== null) {
      parsed = value as Record<string, unknown>;
    }
  } catch {
    // Unreadable or blocked: the defaults will do.
  }

  return {
    clip: CLIP_OPTIONS.includes(parsed.clip as number)
      ? (parsed.clip as number)
      : DEFAULT_SETTINGS.clip,
    randomStart:
      typeof parsed.randomStart === "boolean"
        ? parsed.randomStart
        : DEFAULT_SETTINGS.randomStart,
    answers:
      parsed.answers === "typed" || parsed.answers === "choice"
        ? parsed.answers
        : DEFAULT_SETTINGS.answers,
  };
}

export function saveSettings(settings: TimeAttackSettings): void {
  try {
    localStorage.setItem(TIME_ATTACK_SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Not remembered; the run still plays.
  }
}

/**
 * The next song of a run: one try, the clip length picked, and for a random
 * start a point inside the clip file that leaves the whole length to play.
 * That keeps to the one 16-second clip per song: whole songs are too big to
 * wait for between answers.
 */
export function dealRound(
  settings: TimeAttackSettings,
  run: number,
  played: Round[],
  random: () => number = Math.random
): Round {
  const solution: Song = pickSong(played);
  const latest = Math.max(CLIP_FILE_SECONDS - settings.clip, 0);
  const startTime = settings.randomStart
    ? Math.floor(random() * latest * 10) / 10
    : 0;

  return {
    solution,
    currentTry: 0,
    didGuess: false,
    guesses: emptyGuesses(),
    startTime,
    tries: 1,
    clip: settings.clip,
    run,
    ...(settings.answers === "choice"
      ? { choices: makeChoices(solution, random) }
      : {}),
  };
}

/** The round answered: with a song, or passed on with none. */
export function answerRound(round: Round, song: Song | null): Round {
  const isCorrect = song !== null && song.themeNo === round.solution.themeNo;
  const guesses = [...round.guesses];
  guesses[0] = song
    ? { song, skipped: false, isCorrect }
    : { song: undefined, skipped: true, isCorrect: undefined };

  return { ...round, guesses, currentTry: 1, didGuess: isCorrect };
}

/**
 * The run's clock. Time is only spent while `since` is set: the clock stops
 * while a song loads, so a slow connection doesn't eat into the run.
 */
export interface Clock {
  /** Milliseconds used up before `since`. */
  spent: number;
  /** When the clock last started, or null while it is stopped. */
  since: number | null;
}

export function timeUsed(clock: Clock, now: number): number {
  return clock.spent + (clock.since === null ? 0 : now - clock.since);
}

export function timeLeft(clock: Clock, now: number): number {
  return Math.max(TIME_ATTACK_MS - timeUsed(clock, now), 0);
}

export function runClock(clock: Clock, running: boolean, now: number): Clock {
  if (running === (clock.since !== null)) return clock;
  return running
    ? { ...clock, since: now }
    : { spent: timeUsed(clock, now), since: null };
}

/** One finished run, as its saved rounds tell it. */
export interface RunSummary {
  id: number;
  score: number;
  answered: number;
  answers: Answers;
  clip: number;
}

/** The saved rounds, as runs in the order they were played. */
export function runsOf(rounds: Round[]): RunSummary[] {
  const runs = new Map<number, Round[]>();
  for (const round of rounds) {
    if (round.run === undefined) continue;
    runs.set(round.run, [...(runs.get(round.run) ?? []), round]);
  }

  return [...runs.entries()]
    .sort(([a], [b]) => a - b)
    .map(([id, list]) => ({
      id,
      score: list.filter((round) => round.didGuess).length,
      answered: list.length,
      answers: list[0].choices ? "choice" : "typed",
      clip: list[0].clip ?? 0,
    }));
}

export interface TimeAttackStats {
  runs: number;
  /** The best score with each way of answering, or 0 before any run. */
  best: Record<Answers, number>;
  /** Songs answered right across every run. */
  right: number;
  answered: number;
  last: RunSummary | null;
}

export function timeAttackStats(rounds: Round[]): TimeAttackStats {
  const runs = runsOf(rounds);
  const bestOf = (answers: Answers) =>
    Math.max(
      0,
      ...runs.filter((run) => run.answers === answers).map((run) => run.score)
    );

  return {
    runs: runs.length,
    best: { typed: bestOf("typed"), choice: bestOf("choice") },
    right: runs.reduce((sum, run) => sum + run.score, 0),
    answered: runs.reduce((sum, run) => sum + run.answered, 0),
    last: runs[runs.length - 1] ?? null,
  };
}

export function answersLabel(answers: Answers): string {
  return answers === "choice" ? "4-Choice" : "Typed";
}

/** m:ss, rounded up so the clock reads 0:00 only when time is up. */
export function formatClock(ms: number): string {
  const seconds = Math.ceil(ms / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

/** Longest row of squares in the share text, so it stays one chat line. */
const MAX_SQUARES = 30;

/** The text copied at the end of a run. Like the others, it names no song. */
export function timeAttackShareText(
  rounds: Round[],
  settings: TimeAttackSettings
): string {
  const score = rounds.filter((round) => round.didGuess).length;
  const squares = rounds
    .slice(0, MAX_SQUARES)
    .map((round) => (round.didGuess ? "🟩" : "🟥"))
    .join("");
  const more = rounds.length > MAX_SQUARES ? "…" : "";

  return [
    "Blue Archive Heardle ⏱ Time Attack",
    `${score} right in ${formatClock(TIME_ATTACK_MS)} · ${answersLabel(
      settings.answers
    )} · ${settings.clip}s clips${
      settings.randomStart ? " · random start" : ""
    }`,
    `${squares}${more}`,
    SITE_URL,
  ].join("\n");
}
