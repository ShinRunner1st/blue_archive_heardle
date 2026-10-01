import { VOICE_TIME_ATTACK_SETTINGS_KEY } from "../constants/game";
import { pageUrl } from "../constants/pages";
import { SKIPPED, VoiceRound } from "../types/voice";
import { studentById } from "./studentRounds";
import {
  Answers,
  answersLabel,
  formatClock,
  RunSummary,
  TIME_ATTACK_MS,
  TimeAttackStats,
} from "./timeAttack";
import { isWon, makeVoiceChoices, pickVoice } from "./voiceRounds";
import { serverSuffix } from "./server";
import { stamped } from "./roundId";

/**
 * Every line, or title calls only: "Blue Archive!" from everyone, so only
 * the voice tells them apart.
 */
export type VoiceLines = "all" | "titles";

/**
 * Voice time attack's settings: typed answers or four, and which lines. A
 * line plays whole, so there is no clip length or start to pick.
 */
export interface VoiceTimeAttackSettings {
  answers: Answers;
  lines: VoiceLines;
}

export const DEFAULT_VOICE_SETTINGS: VoiceTimeAttackSettings = {
  answers: "choice",
  lines: "all",
};

export function linesLabel(lines: VoiceLines): string {
  return lines === "titles" ? "Title calls" : "All lines";
}

/** The settings picked last, or the defaults. */
export function loadVoiceSettings(): VoiceTimeAttackSettings {
  try {
    const raw = localStorage.getItem(VOICE_TIME_ATTACK_SETTINGS_KEY);
    const value: unknown = raw ? JSON.parse(raw) : null;
    const saved = value as Record<string, unknown> | null;
    const answers = saved?.answers;
    if (answers === "typed" || answers === "choice") {
      return { answers, lines: saved?.lines === "titles" ? "titles" : "all" };
    }
  } catch {
    // Unreadable or blocked: the defaults will do.
  }
  return DEFAULT_VOICE_SETTINGS;
}

export function saveVoiceSettings(settings: VoiceTimeAttackSettings): void {
  try {
    localStorage.setItem(
      VOICE_TIME_ATTACK_SETTINGS_KEY,
      JSON.stringify(settings)
    );
  } catch {
    // Not remembered; the run still plays.
  }
}

/**
 * The next line of a run, one pick. Students aren't repeated until every one
 * has come up in a run.
 */
export function dealVoiceRound(
  settings: VoiceTimeAttackSettings,
  run: number,
  played: VoiceRound[],
  random: () => number = Math.random
): VoiceRound {
  const titles = settings.lines === "titles";
  const { answer, line } = pickVoice(played, random, titles);
  const student = studentById.get(answer);
  return stamped({
    answer,
    line,
    guesses: [],
    run,
    ...(titles ? { titles: true as const } : {}),
    ...(settings.answers === "choice" && student
      ? { choices: makeVoiceChoices(student, random) }
      : {}),
  });
}

/** The round answered: with a student, or passed on with null. */
export function answerVoiceRound(
  round: VoiceRound,
  id: number | null
): VoiceRound {
  return { ...round, guesses: [id ?? SKIPPED] };
}

/**
 * The saved rounds, as runs in the order they were played, in the OST's
 * shape: a line has no clip length.
 */
export function voiceRunsOf(rounds: VoiceRound[]): RunSummary[] {
  const runs = new Map<number, VoiceRound[]>();
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
      titles: list[0].titles === true,
    }));
}

export function voiceTimeAttackStats(rounds: VoiceRound[]): TimeAttackStats {
  const runs = voiceRunsOf(rounds);
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
export function voiceTimeAttackShareText(
  rounds: VoiceRound[],
  settings: VoiceTimeAttackSettings
): string {
  const score = rounds.filter(isWon).length;
  const squares = rounds
    .slice(0, MAX_SQUARES)
    .map((round) => (isWon(round) ? "🟩" : "🟥"))
    .join("");
  const more = rounds.length > MAX_SQUARES ? "…" : "";

  return [
    `Blue Archive Heardle 🔊 Voice Time Attack${serverSuffix()}`,
    `${score} right in ${formatClock(TIME_ATTACK_MS)} · ${answersLabel(
      settings.answers
    )} · ${linesLabel(settings.lines)}`,
    `${squares}${more}`,
    pageUrl("voice"),
  ].join("\n");
}
