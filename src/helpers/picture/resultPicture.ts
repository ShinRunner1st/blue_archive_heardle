import { playTimes } from "../../constants";
import { MAX_TRIES } from "../../constants/game";
import { resultTitle } from "../../constants/resultText";
import { GameMode } from "../../types/mode";
import { Round } from "../../types/stats";
import { Song } from "../../types/song";
import { triesOf } from "../calStats";
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

export type TryTone = "correct" | "wrong" | "skipped" | "unused";

export interface ResultPictureInput {
  mode: GameMode;
  round: Round;
  /** The endless "wins/played" tally. */
  score: string;
  /** The mode's run: daily's day streak, or endless wins in a row. */
  streak: number;
}

/** What goes on the picture, worked out apart from drawing so it can be tested. */
export interface ResultPictureContent {
  tag: string;
  title: string;
  subtitle: string;
  tries: TryTone[];
  /** Under each square: how much of the clip that try played. */
  tryLabels: string[];
  stats: Array<{ label: string; value: string }>;
  /** The answer, on endless pictures only: a daily one must spoil nothing. */
  song: Song | null;
}

/** The same squares as the share text: the coloured run is the score. */
function tryTones(round: Round): TryTone[] {
  return Array.from({ length: triesOf(round) }, (_, index) => {
    const guess = round.guesses[index];
    if (index >= round.currentTry) return "unused";
    if (guess?.isCorrect) return "correct";
    if (guess?.skipped) return "skipped";
    return "wrong";
  });
}

export function resultPictureContent({
  mode,
  round,
  score,
  streak,
}: ResultPictureInput): ResultPictureContent {
  const isDaily = mode === "daily";
  const isChoice = round.choices !== undefined;
  const tries = Math.min(round.currentTry, MAX_TRIES);

  return {
    tag:
      isDaily && typeof round.day === "number"
        ? `DAILY #${round.day}`
        : isChoice
        ? "4-CHOICE"
        : "ENDLESS",
    title: withoutEmoji(
      resultTitle(round.didGuess, round.currentTry, round.tries)
    ),
    subtitle: isChoice
      ? round.didGuess
        ? "Picked out of four answers"
        : "Missed out of four answers"
      : round.didGuess
      ? `Guessed in ${tries} of ${MAX_TRIES} ${tries === 1 ? "try" : "tries"}`
      : `Not guessed in ${MAX_TRIES} tries`,
    tries: tryTones(round),
    tryLabels:
      round.clip !== undefined
        ? [`${round.clip}s`]
        : playTimes.map((time) => `${time / 1000}s`),
    stats: isDaily
      ? [
          { label: "Tries", value: round.didGuess ? `${tries}/6` : "X/6" },
          { label: "Day streak", value: String(streak) },
        ]
      : [
          { label: "Score", value: score },
          { label: "Win streak", value: String(streak) },
        ],
    song: isDaily ? null : round.solution,
  };
}

const TONE_COLORS: Record<TryTone, string> = {
  correct: COLORS.green,
  wrong: COLORS.red,
  skipped: COLORS.skipped,
  unused: COLORS.unused,
};

const TILE = 96;
const TILE_GAP = 18;
const TILES_TOP = 350;

export function drawResultPicture(
  ctx: CanvasRenderingContext2D,
  content: ResultPictureContent,
  images: PictureImages
): void {
  drawFrame(ctx, images, content.tag);

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = content.tries.includes("correct") ? COLORS.navy : COLORS.red;
  fitText(ctx, content.title, LEFT, 262, RIGHT - LEFT, "800", 52);

  ctx.fillStyle = COLORS.muted;
  ctx.font = `600 28px ${FONT}`;
  ctx.fillText(content.subtitle, LEFT, 308);

  content.tries.forEach((tone, index) => {
    const x = LEFT + index * (TILE + TILE_GAP);
    ctx.fillStyle = TONE_COLORS[tone];
    roundedRect(ctx, x, TILES_TOP, TILE, TILE, 16);
    ctx.fill();

    ctx.fillStyle = COLORS.muted;
    ctx.font = `700 22px ${FONT}`;
    ctx.textAlign = "center";
    ctx.fillText(
      content.tryLabels[index] ?? "",
      x + TILE / 2,
      TILES_TOP + TILE + 32
    );
  });

  // The stats stand to the right of the squares, one above the other.
  const statsLeft = LEFT + MAX_TRIES * (TILE + TILE_GAP) + 30;
  content.stats.forEach(({ label, value }, index) => {
    const top = TILES_TOP - 14 + index * 86;
    ctx.textAlign = "left";
    ctx.fillStyle = COLORS.navy;
    fitText(ctx, value, statsLeft, top + 40, RIGHT - statsLeft, "800", 44);
    ctx.fillStyle = COLORS.muted;
    ctx.font = `700 18px ${FONT}`;
    ctx.fillText(label.toUpperCase(), statsLeft, top + 64);
  });

  // Along the bottom: the song on endless, a nudge to play on daily.
  const bottom = PANEL.y + PANEL.height - 40;
  ctx.textAlign = "left";
  if (content.song) {
    ctx.fillStyle = COLORS.blue;
    fitText(ctx, content.song.name, LEFT, bottom - 34, 700, "800", 34);
    ctx.fillStyle = COLORS.muted;
    fitText(
      ctx,
      `${content.song.artist} · Theme ${content.song.themeNo}`,
      LEFT,
      bottom,
      700,
      "600",
      24
    );
  } else {
    ctx.fillStyle = COLORS.blue;
    fitText(
      ctx,
      "Can you name today's song?",
      LEFT,
      bottom - 8,
      700,
      "800",
      34
    );
  }

  drawAddress(ctx, bottom - 8);
}

/** Draws the picture as a PNG. Fails only if the browser has no canvas. */
export function makeResultPicture(
  input: ResultPictureInput,
  sources: { backdrop: string; logo: string }
): Promise<Blob> {
  const content = resultPictureContent(input);
  return makePicture(sources, (ctx, images) =>
    drawResultPicture(ctx, content, images)
  );
}

/** Daily pictures are named by puzzle; endless ones never name the song. */
export function resultPictureName({ mode, round }: ResultPictureInput): string {
  return mode === "daily" && typeof round.day === "number"
    ? `baheardle-daily-${round.day}.png`
    : `baheardle-${mode}.png`;
}
