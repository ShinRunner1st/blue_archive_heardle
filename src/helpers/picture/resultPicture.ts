import { playTimes } from "../../constants";
import { MAX_TRIES } from "../../constants/game";
import { resultTitle } from "../../constants/resultText";
import { GameMode } from "../../types/mode";
import { Round } from "../../types/stats";
import { Song } from "../../types/song";
import {
  canvasToBlob,
  COLORS,
  drawBackdrop,
  drawPanel,
  drawTag,
  fitText,
  FONT,
  loadFonts,
  loadImage,
  PICTURE_HEIGHT,
  PICTURE_WIDTH,
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
  stats: Array<{ label: string; value: string }>;
  /** The answer, on endless pictures only: a daily one must spoil nothing. */
  song: Song | null;
}

/** The same squares as the share text: the coloured run is the score. */
function tryTones(round: Round): TryTone[] {
  return Array.from({ length: MAX_TRIES }, (_, index) => {
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
  const tries = Math.min(round.currentTry, MAX_TRIES);

  return {
    tag:
      isDaily && typeof round.day === "number"
        ? `DAILY #${round.day}`
        : "ENDLESS",
    title: withoutEmoji(resultTitle(round.didGuess, round.currentTry)),
    subtitle: round.didGuess
      ? `Guessed in ${tries} of ${MAX_TRIES} ${tries === 1 ? "try" : "tries"}`
      : `Not guessed in ${MAX_TRIES} tries`,
    tries: tryTones(round),
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

/** The pictures the drawing needs; either may be missing. */
export interface ResultPictureImages {
  backdrop: HTMLImageElement | null;
  logo: HTMLImageElement | null;
}

const PANEL = { x: 70, y: 56, width: 1060, height: 563 };
const LEFT = 110;
const RIGHT = PANEL.x + PANEL.width - 40;
const TILE = 96;
const TILE_GAP = 18;
const TILES_TOP = 350;

export function drawResultPicture(
  ctx: CanvasRenderingContext2D,
  content: ResultPictureContent,
  { backdrop, logo }: ResultPictureImages
): void {
  drawBackdrop(ctx, backdrop);
  drawPanel(ctx, PANEL.x, PANEL.y, PANEL.width, PANEL.height);

  if (logo && logo.naturalWidth > 0) {
    const height = 96;
    const width = (logo.naturalWidth / logo.naturalHeight) * height;
    ctx.drawImage(logo, LEFT - 10, PANEL.y + 26, width, height);
  }
  drawTag(ctx, content.tag, RIGHT, PANEL.y + 44);

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
      `${playTimes[index] / 1000}s`,
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

  ctx.fillStyle = COLORS.navy;
  ctx.font = `800 26px ${FONT}`;
  ctx.textAlign = "right";
  ctx.fillText("baheardle.com", RIGHT, bottom - 8);
}

/** Draws the picture as a PNG. Fails only if the browser has no canvas. */
export async function makeResultPicture(
  input: ResultPictureInput,
  sources: { backdrop: string; logo: string }
): Promise<Blob> {
  const [backdrop, logo] = await Promise.all([
    loadImage(sources.backdrop),
    loadImage(sources.logo),
    loadFonts(),
  ]);

  const canvas = document.createElement("canvas");
  canvas.width = PICTURE_WIDTH;
  canvas.height = PICTURE_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("This browser can't draw pictures");

  drawResultPicture(ctx, resultPictureContent(input), { backdrop, logo });
  return canvasToBlob(canvas);
}

/** Daily pictures are named by puzzle; endless ones never name the song. */
export function resultPictureName({ mode, round }: ResultPictureInput): string {
  return mode === "daily" && typeof round.day === "number"
    ? `baheardle-daily-${round.day}.png`
    : "baheardle-endless.png";
}
