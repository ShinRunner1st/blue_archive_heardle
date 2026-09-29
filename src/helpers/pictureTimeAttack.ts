import { PICTURE_TIME_ATTACK_SETTINGS_KEY, SITE_URL } from "../constants/game";
import { PictureKind, PictureRound } from "../types/picture";
import { SKIPPED } from "../types/voice";
import {
  KIND_NAMES,
  KIND_SYMBOLS,
  makePictureChoices,
  pickPicture,
} from "./pictureRounds";
import {
  Answers,
  answersLabel,
  formatClock,
  RunSummary,
  TIME_ATTACK_MS,
  TimeAttackStats,
} from "./timeAttack";
import { isWon } from "./voiceRounds";

/**
 * Picture time attack's settings: typed answers or four, and the pictures
 * as they are or their silhouettes.
 */
export interface PictureTimeAttackSettings {
  answers: Answers;
  shape: boolean;
}

export const DEFAULT_PICTURE_SETTINGS: PictureTimeAttackSettings = {
  answers: "choice",
  shape: false,
};

export function shapeLabel(shape: boolean): string {
  return shape ? "Silhouettes" : "Pictures";
}

/** The settings picked last, or the defaults. */
export function loadPictureSettings(): PictureTimeAttackSettings {
  try {
    const raw = localStorage.getItem(PICTURE_TIME_ATTACK_SETTINGS_KEY);
    const value: unknown = raw ? JSON.parse(raw) : null;
    const saved = value as Record<string, unknown> | null;
    const answers = saved?.answers;
    if (answers === "typed" || answers === "choice") {
      return { answers, shape: saved?.shape === true };
    }
  } catch {
    // Unreadable or blocked: the defaults will do.
  }
  return DEFAULT_PICTURE_SETTINGS;
}

export function savePictureSettings(settings: PictureTimeAttackSettings): void {
  try {
    localStorage.setItem(
      PICTURE_TIME_ATTACK_SETTINGS_KEY,
      JSON.stringify(settings)
    );
  } catch {
    // Not remembered; the run still plays.
  }
}

/**
 * The next picture of a run, one pick. Pictures aren't repeated until every
 * one has come up in a run.
 */
export function dealPictureRound(
  kind: PictureKind,
  settings: PictureTimeAttackSettings,
  run: number,
  played: PictureRound[],
  random: () => number = Math.random
): PictureRound {
  const answer = pickPicture(kind, played, random);
  return {
    answer,
    guesses: [],
    run,
    ...(settings.shape ? { shape: true as const } : {}),
    ...(settings.answers === "choice"
      ? { choices: makePictureChoices(kind, answer, random) }
      : {}),
  };
}

/** The saved rounds, as runs in the order they were played. */
export function pictureRunsOf(rounds: PictureRound[]): RunSummary[] {
  const runs = new Map<number, PictureRound[]>();
  for (const round of rounds) {
    if (round.run === undefined) continue;
    runs.set(round.run, [...(runs.get(round.run) ?? []), round]);
  }

  return [...runs.entries()]
    .sort(([a], [b]) => a - b)
    .map(([id, list]) => ({
      id,
      score: list.filter(isWon).length,
      answered: list.length,
      answers: list[0].choices ? "choice" : "typed",
      clip: 0,
      shapes: list[0].shape === true,
    }));
}

export function pictureTimeAttackStats(
  rounds: PictureRound[]
): TimeAttackStats {
  const runs = pictureRunsOf(rounds);
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

/** Longest row of squares in the share text, so it stays one chat line. */
const MAX_SQUARES = 30;

/** The text copied at the end of a run. It names nobody. */
export function pictureTimeAttackShareText(
  kind: PictureKind,
  rounds: PictureRound[],
  settings: PictureTimeAttackSettings
): string {
  const score = rounds.filter(isWon).length;
  const squares = rounds
    .slice(0, MAX_SQUARES)
    .map((round) => (isWon(round) ? "🟩" : "🟥"))
    .join("");
  const more = rounds.length > MAX_SQUARES ? "…" : "";

  return [
    `Blue Archive Heardle ${KIND_SYMBOLS[kind]} ${KIND_NAMES[kind]} Time Attack`,
    `${score} right in ${formatClock(TIME_ATTACK_MS)} · ${answersLabel(
      settings.answers
    )} · ${shapeLabel(settings.shape)}`,
    `${squares}${more}`,
    SITE_URL,
  ].join("\n");
}

/** The round answered: with a student, or passed on with null. */
export function answerPictureRound(
  round: PictureRound,
  id: number | null
): PictureRound {
  return { ...round, guesses: [id ?? SKIPPED] };
}
