import { resultTitle } from "../../constants/resultText";
import {
  PictureKind,
  PictureRound,
  PictureRoundMode,
} from "../../types/picture";
import { Student } from "../../types/student";
import { SKIPPED } from "../../types/voice";
import { dateStamp } from "../daily";
import {
  answerOf,
  KIND_NAMES,
  KIND_SYMBOLS,
  PICTURE_MODE_NAMES,
  pictureAnswers,
} from "../pictureRounds";
import { PictureTimeAttackSettings, shapeLabel } from "../pictureTimeAttack";
import {
  Answers,
  answersLabel,
  formatClock,
  RunSummary,
  TIME_ATTACK_MS,
  TimeAttackStats,
} from "../timeAttack";
import { isWon, triesOf } from "../voiceRounds";
import { makePicture, withoutEmoji } from "./canvas";
import {
  drawRecapPicture,
  RecapPictureContent,
  reportDate,
} from "./recapPicture";
import { loadSheetImage } from "./studentPicture";
import {
  drawTimeAttackPicture,
  TimeAttackPictureContent,
} from "./timeAttackPicture";
import { drawVoicePicture, VoicePictureContent } from "./voicePicture";

const tagOf = (kind: PictureKind, mode: PictureRoundMode) =>
  `${KIND_NAMES[kind]} · ${PICTURE_MODE_NAMES[mode]}`.toUpperCase();

/** "halo" or "weapon", as the pictures' words have it. */
const noun = (kind: PictureKind) => KIND_NAMES[kind].toLowerCase();

export interface GuessPictureInput {
  kind: PictureKind;
  mode: PictureRoundMode;
  round: PictureRound;
  answer: Student;
  /** The endless "named/played" tally. */
  score: string;
  /** Daily's day streak, or wins in a row. */
  streak: number;
}

/**
 * What goes on a halo or weapon result picture: Voice mode's, with the
 * kind's symbol. Like the share text, the squares name nobody, and a daily
 * picture shows no answer.
 */
export function guessPictureContent({
  kind,
  mode,
  round,
  answer,
  score,
  streak,
}: GuessPictureInput): VoicePictureContent {
  const isDaily = mode === "daily";
  const won = isWon(round);
  const tries = triesOf(round);
  const count = round.guesses.length;
  const weapon = kind === "weapon" ? answerOf(kind, answer.id)?.name : "";

  return {
    tag:
      isDaily && typeof round.day === "number"
        ? `${KIND_NAMES[kind]} · DAILY #${round.day}`.toUpperCase()
        : tagOf(kind, mode),
    title: withoutEmoji(resultTitle(won, count, tries)),
    subtitle: !won
      ? `The ${noun(kind)} got away this time`
      : tries === 1
      ? `Picked out of four by the ${noun(kind)}`
      : `Named by the ${noun(kind)} on try ${count} of ${tries}`,
    tries: Array.from({ length: tries }, (_, index) => {
      const guess = round.guesses[index];
      if (guess === undefined) return "unused";
      if (guess === round.answer) return "right";
      return guess === SKIPPED ? "skipped" : "wrong";
    }),
    stats: isDaily
      ? [
          { label: "Tries", value: won ? `${count}/${tries}` : "X" },
          { label: "Day streak", value: String(streak) },
        ]
      : [
          { label: "Score", value: score },
          { label: "Win streak", value: String(streak) },
        ],
    answer: isDaily ? null : answer,
    symbol: KIND_SYMBOLS[kind],
    teaser: `Can you name today's ${noun(kind)}?`,
    ...(weapon ? { detail: `${weapon} · ${answer.school}` } : {}),
  };
}

/** Draws the picture as a PNG. Fails only if the browser has no canvas. */
export async function makeGuessPicture(
  input: GuessPictureInput,
  sources: { backdrop: string; logo: string }
): Promise<Blob> {
  const content = guessPictureContent(input);
  const sheet = content.answer ? await loadSheetImage() : null;
  return makePicture(sources, (ctx, images) =>
    drawVoicePicture(ctx, content, images, sheet)
  );
}

/** Daily pictures are named by puzzle; endless ones never name the student. */
export function guessPictureName({
  kind,
  mode,
  round,
}: Pick<GuessPictureInput, "kind" | "mode" | "round">): string {
  return mode === "daily" && typeof round.day === "number"
    ? `baheardle-${kind}-${round.day}.png`
    : `baheardle-${kind}-${mode}.png`;
}

/** A kind and mode's record, as its stats pop-up has it. */
export interface GuessRecapStats {
  kind: PictureKind;
  mode: PictureRoundMode;
  /** Losses at 0, then wins by the try they came on. */
  tally: number[];
  played: number;
  streak: number;
  best: number;
  /** Different pictures named at least once. */
  found: number;
}

/** The picture game's recap, on the same card as the others. Names nobody. */
export function guessRecapContent(
  stats: GuessRecapStats,
  now: Date = new Date()
): RecapPictureContent {
  const { kind, tally, played } = stats;
  const wins = played - tally[0];
  const rate = played > 0 ? Math.round((wins / played) * 100) : 0;
  const isDaily = stats.mode === "daily";
  const onePick = tally.length === 2;

  return {
    tag: `${tagOf(kind, stats.mode)} RECAP`,
    title: `${KIND_NAMES[kind]} ${PICTURE_MODE_NAMES[stats.mode]} report`,
    subtitle: reportDate(now),
    tiles: [
      { label: isDaily ? "Puzzles" : "Rounds", value: String(played) },
      { label: "Named", value: `${rate}%` },
      {
        label: isDaily ? "Day streak" : "Win streak",
        value: String(stats.streak),
      },
      { label: "Best streak", value: String(stats.best) },
    ],
    barsLabel: onePick ? undefined : "Named on try",
    bars: [
      ...tally.slice(1).map((count, index) => ({
        label: onePick ? "✓" : String(index + 1),
        count,
      })),
      { label: "X", count: tally[0], lost: true },
    ],
    footer: `${stats.found} of ${pictureAnswers(kind).length} ${noun(
      kind
    )}s named`,
  };
}

export function makeGuessRecap(
  stats: GuessRecapStats,
  sources: { backdrop: string; logo: string }
): Promise<Blob> {
  const content = guessRecapContent(stats);
  return makePicture(sources, (ctx, images) =>
    drawRecapPicture(ctx, content, images)
  );
}

export function guessRecapName(
  kind: PictureKind,
  mode: PictureRoundMode | "timeattack",
  now: Date = new Date()
): string {
  return `baheardle-${kind}-${mode}-recap-${dateStamp(now)}.png`;
}

export interface GuessTimeAttackPictureInput {
  kind: PictureKind;
  rounds: PictureRound[];
  settings: PictureTimeAttackSettings;
  /** The best score with these settings, this run included. */
  best: number;
}

const PER_PICTURE = 42;

/** A halo or weapon run, on the OST time attack's picture. It names nobody. */
export function guessTimeAttackPictureContent({
  kind,
  rounds,
  settings,
  best,
}: GuessTimeAttackPictureInput): TimeAttackPictureContent {
  const score = rounds.filter(isWon).length;
  return {
    tag: `${KIND_NAMES[kind]} · TIME ATTACK`.toUpperCase(),
    title: `${score} ${noun(kind)}${score === 1 ? "" : "s"} in ${formatClock(
      TIME_ATTACK_MS
    )}`,
    subtitle: `${answersLabel(settings.answers)} · ${shapeLabel(
      settings.shape
    )}`,
    squares: rounds.slice(0, PER_PICTURE).map(isWon),
    more: rounds.length > PER_PICTURE ? `+${rounds.length - PER_PICTURE}` : "",
    stats: [
      { label: "Right", value: `${score}/${rounds.length}` },
      { label: "Best", value: String(best) },
    ],
  };
}

export function makeGuessTimeAttackPicture(
  input: GuessTimeAttackPictureInput,
  sources: { backdrop: string; logo: string }
): Promise<Blob> {
  const content = guessTimeAttackPictureContent(input);
  return makePicture(sources, (ctx, images) =>
    drawTimeAttackPicture(ctx, content, images)
  );
}

export function guessTimeAttackPictureName(
  kind: PictureKind,
  now: Date = new Date()
): string {
  return `baheardle-${kind}-timeattack-${dateStamp(now)}.png`;
}

/**
 * The picture game's time attack recap: the best run for each way of
 * playing, typed or four answers, pictures or silhouettes.
 */
export function guessTimeAttackRecapContent(
  kind: PictureKind,
  stats: TimeAttackStats,
  runs: RunSummary[],
  now: Date = new Date()
): RecapPictureContent {
  const rate =
    stats.answered > 0 ? Math.round((stats.right / stats.answered) * 100) : 0;
  const bestOf = (answers: Answers, shapes: boolean) =>
    Math.max(
      0,
      ...runs
        .filter((run) => run.answers === answers && !!run.shapes === shapes)
        .map((run) => run.score)
    );

  return {
    tag: `${KIND_NAMES[kind]} · TIME ATTACK RECAP`.toUpperCase(),
    title: `${KIND_NAMES[kind]} Time Attack report`,
    subtitle: reportDate(now),
    tiles: [
      { label: "Runs", value: String(stats.runs) },
      { label: "Right", value: `${rate}%` },
      { label: "Best typed", value: String(stats.best.typed) },
      { label: "Best 4-Choice", value: String(stats.best.choice) },
    ],
    barsLabel: "Best run",
    bars: [
      { label: "Typed", count: bestOf("typed", false) },
      { label: "4-Choice", count: bestOf("choice", false) },
      { label: "Typed · shapes", count: bestOf("typed", true) },
      { label: "4-Choice · shapes", count: bestOf("choice", true) },
    ],
    footer: `${KIND_NAMES[kind]}s named ${stats.right} of ${stats.answered} in time attack runs`,
  };
}

export function makeGuessTimeAttackRecap(
  kind: PictureKind,
  stats: TimeAttackStats,
  runs: RunSummary[],
  sources: { backdrop: string; logo: string }
): Promise<Blob> {
  const content = guessTimeAttackRecapContent(kind, stats, runs);
  return makePicture(sources, (ctx, images) =>
    drawRecapPicture(ctx, content, images)
  );
}
