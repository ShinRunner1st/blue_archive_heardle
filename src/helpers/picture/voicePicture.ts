import { resultTitle } from "../../constants/resultText";
import { Student } from "../../types/student";
import { SKIPPED, VoiceRound, VoiceRoundMode } from "../../types/voice";
import { dateStamp } from "../daily";
import {
  Answers,
  answersLabel,
  formatClock,
  RunSummary,
  TIME_ATTACK_MS,
  TimeAttackStats,
} from "../timeAttack";
import { isWon, triesOf, voicePool } from "../voiceRounds";
import { linesLabel, VoiceTimeAttackSettings } from "../voiceTimeAttack";
import {
  COLORS,
  CONTENT_LEFT as LEFT,
  CONTENT_RIGHT as RIGHT,
  drawAddress,
  drawFrame,
  fitText,
  FONT,
  makePicture,
  PANEL,
  PictureImages,
  roundedRect,
  withoutEmoji,
} from "./canvas";
import {
  drawRecapPicture,
  RecapPictureContent,
  reportDate,
} from "./recapPicture";
import { drawStudentIcon, loadSheetImage } from "./studentPicture";
import {
  drawTimeAttackPicture,
  TimeAttackPictureContent,
} from "./timeAttackPicture";
import { withServerTag } from "../server";

/** Each mode's name, as the tag and a recap's title give it. */
const MODE_NAMES: Record<VoiceRoundMode, string> = {
  daily: "Daily",
  endless: "Classic",
  nohint: "No hints",
  choice: "4-Choice",
};

const tagOf = (mode: VoiceRoundMode) =>
  `VOICE · ${MODE_NAMES[mode].toUpperCase()}`;

export interface VoicePictureInput {
  mode: VoiceRoundMode;
  round: VoiceRound;
  answer: Student;
  /** The endless "named/played" tally. */
  score: string;
  /** Daily's day streak, or wins in a row. */
  streak: number;
}

/** How a try went, a square each, as in the share text. */
export type TryMark = "right" | "wrong" | "skipped" | "unused";

export interface VoicePictureContent {
  tag: string;
  title: string;
  subtitle: string;
  tries: TryMark[];
  stats: Array<{ label: string; value: string }>;
  /** The speaker, on endless pictures only: a daily one must spoil nothing. */
  answer: Student | null;
  /** Before the squares: a speaker, or the picture game's halo or gun. */
  symbol?: string;
  /** In place of the answer on a daily picture. */
  teaser?: string;
  /** Under the answer's name: their school and club, unless told. */
  detail?: string;
}

/**
 * What goes on a Voice result picture, worked out apart from drawing so it
 * can be tested. Like the share text, the squares name nobody.
 */
export function voicePictureContent({
  mode,
  round,
  answer,
  score,
  streak,
}: VoicePictureInput): VoicePictureContent {
  const isDaily = mode === "daily";
  const won = isWon(round);
  const tries = triesOf(round);
  const count = round.guesses.length;

  return {
    tag: withServerTag(
      isDaily && typeof round.day === "number"
        ? `VOICE · DAILY #${round.day}`
        : tagOf(mode)
    ),
    title: withoutEmoji(resultTitle(won, count, tries)),
    subtitle: !won
      ? "The voice got away this time"
      : tries === 1
      ? "Picked out of four by the voice"
      : `Named by the voice on try ${count} of ${tries}`,
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
  };
}

const MARK_COLORS: Record<TryMark, string> = {
  right: COLORS.green,
  wrong: COLORS.red,
  skipped: COLORS.muted,
  unused: COLORS.unused,
};

const SQUARE = 64;
const GAP = 12;
const ROW_TOP = 350;

export function drawVoicePicture(
  ctx: CanvasRenderingContext2D,
  content: VoicePictureContent,
  images: PictureImages,
  sheet: HTMLImageElement | null
): void {
  drawFrame(ctx, images, content.tag);

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = content.tries.includes("right") ? COLORS.navy : COLORS.red;
  fitText(ctx, content.title, LEFT, 262, RIGHT - LEFT, "800", 52);

  ctx.fillStyle = COLORS.muted;
  ctx.font = `600 28px ${FONT}`;
  ctx.fillText(content.subtitle, LEFT, 308);

  // A speaker, then a square for each try.
  ctx.fillStyle = COLORS.navy;
  ctx.font = `800 44px ${FONT}`;
  ctx.fillText(content.symbol ?? "🔊", LEFT, ROW_TOP + 50);
  const squaresLeft = LEFT + 70;
  content.tries.forEach((mark, index) => {
    ctx.fillStyle = MARK_COLORS[mark];
    roundedRect(
      ctx,
      squaresLeft + index * (SQUARE + GAP),
      ROW_TOP,
      SQUARE,
      SQUARE,
      12
    );
    ctx.fill();
  });

  // The stats, side by side, to the right of the squares.
  const statsLeft = squaresLeft + 4 * (SQUARE + GAP) + 50;
  content.stats.forEach(({ label, value }, index) => {
    const x = statsLeft + index * 200;
    ctx.textAlign = "left";
    ctx.fillStyle = COLORS.navy;
    fitText(ctx, value, x, ROW_TOP + 44, 180, "800", 44);
    ctx.fillStyle = COLORS.muted;
    ctx.font = `700 18px ${FONT}`;
    ctx.fillText(label.toUpperCase(), x, ROW_TOP + 70);
  });

  const bottom = PANEL.y + PANEL.height - 40;
  const top = ROW_TOP + SQUARE + 36;
  if (content.answer) {
    // Who was speaking: their icon, name, school and club.
    drawStudentIcon(ctx, sheet, content.answer.id, LEFT, top, 88);
    ctx.textAlign = "left";
    ctx.fillStyle = COLORS.blue;
    fitText(ctx, content.answer.name, LEFT + 108, top + 42, 600, "800", 34);
    ctx.fillStyle = COLORS.muted;
    fitText(
      ctx,
      content.detail ?? `${content.answer.school} · ${content.answer.club}`,
      LEFT + 108,
      top + 76,
      600,
      "600",
      22
    );
  } else {
    ctx.textAlign = "left";
    ctx.fillStyle = COLORS.blue;
    fitText(
      ctx,
      content.teaser ?? "Can you name today's voice?",
      LEFT,
      bottom - 8,
      640,
      "800",
      34
    );
  }

  drawAddress(ctx, bottom - 8);
}

/** Draws the picture as a PNG. Fails only if the browser has no canvas. */
export async function makeVoicePicture(
  input: VoicePictureInput,
  sources: { backdrop: string; logo: string }
): Promise<Blob> {
  const content = voicePictureContent(input);
  const sheet = content.answer ? await loadSheetImage() : null;
  return makePicture(sources, (ctx, images) =>
    drawVoicePicture(ctx, content, images, sheet)
  );
}

/** Daily pictures are named by puzzle; endless ones never name the student. */
export function voicePictureName({
  mode,
  round,
}: Pick<VoicePictureInput, "mode" | "round">): string {
  return mode === "daily" && typeof round.day === "number"
    ? `baheardle-voice-${round.day}.png`
    : `baheardle-voice-${mode}.png`;
}

/** A Voice mode's record, as its stats pop-up has it. */
export interface VoiceRecapStats {
  mode: VoiceRoundMode;
  /** Losses at 0, then wins by the try they came on. */
  tally: number[];
  played: number;
  streak: number;
  best: number;
  /** Different students named at least once. */
  found: number;
}

/** Voice mode's recap, on the same card as the OST's. Names nobody. */
export function voiceRecapContent(
  stats: VoiceRecapStats,
  now: Date = new Date()
): RecapPictureContent {
  const { tally, played } = stats;
  const wins = played - tally[0];
  const rate = played > 0 ? Math.round((wins / played) * 100) : 0;
  const isDaily = stats.mode === "daily";
  const onePick = tally.length === 2;

  return {
    tag: withServerTag(`${tagOf(stats.mode)} RECAP`),
    title: `Voice ${MODE_NAMES[stats.mode]} report`,
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
    footer: `${stats.found} of ${voicePool().length} voices named`,
  };
}

export function makeVoiceRecap(
  stats: VoiceRecapStats,
  sources: { backdrop: string; logo: string }
): Promise<Blob> {
  const content = voiceRecapContent(stats);
  return makePicture(sources, (ctx, images) =>
    drawRecapPicture(ctx, content, images)
  );
}

export function voiceRecapName(
  mode: VoiceRoundMode | "timeattack",
  now: Date = new Date()
): string {
  return `baheardle-voice-${mode}-recap-${dateStamp(now)}.png`;
}

export interface VoiceTimeAttackPictureInput {
  rounds: VoiceRound[];
  settings: VoiceTimeAttackSettings;
  /** The best score with these settings, this run included. */
  best: number;
}

const PER_PICTURE = 42;

/** A Voice run, on the OST time attack's picture. It names nobody. */
export function voiceTimeAttackPictureContent({
  rounds,
  settings,
  best,
}: VoiceTimeAttackPictureInput): TimeAttackPictureContent {
  const score = rounds.filter(isWon).length;
  return {
    tag: withServerTag("VOICE · TIME ATTACK"),
    title: `${score} ${score === 1 ? "voice" : "voices"} in ${formatClock(
      TIME_ATTACK_MS
    )}`,
    subtitle: `${answersLabel(settings.answers)} · ${linesLabel(
      settings.lines
    )}`,
    squares: rounds.slice(0, PER_PICTURE).map(isWon),
    more: rounds.length > PER_PICTURE ? `+${rounds.length - PER_PICTURE}` : "",
    stats: [
      { label: "Right", value: `${score}/${rounds.length}` },
      { label: "Best", value: String(best) },
    ],
  };
}

export function makeVoiceTimeAttackPicture(
  input: VoiceTimeAttackPictureInput,
  sources: { backdrop: string; logo: string }
): Promise<Blob> {
  const content = voiceTimeAttackPictureContent(input);
  return makePicture(sources, (ctx, images) =>
    drawTimeAttackPicture(ctx, content, images)
  );
}

export function voiceTimeAttackPictureName(now: Date = new Date()): string {
  return `baheardle-voice-timeattack-${dateStamp(now)}.png`;
}

/**
 * Voice time attack's recap: the best run for each way of playing, typed or
 * four answers, every line or title calls only.
 */
export function voiceTimeAttackRecapContent(
  stats: TimeAttackStats,
  runs: RunSummary[],
  now: Date = new Date()
): RecapPictureContent {
  const rate =
    stats.answered > 0 ? Math.round((stats.right / stats.answered) * 100) : 0;
  const bestOf = (answers: Answers, titles: boolean) =>
    Math.max(
      0,
      ...runs
        .filter((run) => run.answers === answers && !!run.titles === titles)
        .map((run) => run.score)
    );

  return {
    tag: withServerTag("VOICE · TIME ATTACK RECAP"),
    title: "Voice Time Attack report",
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
      { label: "Typed · titles", count: bestOf("typed", true) },
      { label: "4-Choice · titles", count: bestOf("choice", true) },
    ],
    footer: `Voices named ${stats.right} of ${stats.answered} in time attack runs`,
  };
}

export function makeVoiceTimeAttackRecap(
  stats: TimeAttackStats,
  runs: RunSummary[],
  sources: { backdrop: string; logo: string }
): Promise<Blob> {
  const content = voiceTimeAttackRecapContent(stats, runs);
  return makePicture(sources, (ctx, images) =>
    drawRecapPicture(ctx, content, images)
  );
}
