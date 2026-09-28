import { SITE_URL, VOICE_TIME_ATTACK_SETTINGS_KEY } from "../constants/game";
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

/**
 * Voice time attack has one setting: typed answers or four. A line plays
 * whole, so there is no clip length or start to pick.
 */
export interface VoiceTimeAttackSettings {
  answers: Answers;
}

export const DEFAULT_VOICE_SETTINGS: VoiceTimeAttackSettings = {
  answers: "choice",
};

/** The settings picked last, or the defaults. */
export function loadVoiceSettings(): VoiceTimeAttackSettings {
  try {
    const raw = localStorage.getItem(VOICE_TIME_ATTACK_SETTINGS_KEY);
    const value: unknown = raw ? JSON.parse(raw) : null;
    const answers = (value as Record<string, unknown> | null)?.answers;
    if (answers === "typed" || answers === "choice") return { answers };
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
  const { answer, line } = pickVoice(played, random);
  const student = studentById.get(answer);
  return {
    answer,
    line,
    guesses: [],
    run,
    ...(settings.answers === "choice" && student
      ? { choices: makeVoiceChoices(student, random) }
      : {}),
  };
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
    "Blue Archive Heardle 🔊 Voice Time Attack",
    `${score} right in ${formatClock(TIME_ATTACK_MS)} · ${answersLabel(
      settings.answers
    )}`,
    `${squares}${more}`,
    SITE_URL,
  ].join("\n");
}
