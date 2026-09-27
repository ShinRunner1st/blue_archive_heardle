import { Round } from "../../types/stats";
import { dateStamp } from "../daily";
import {
  answersLabel,
  formatClock,
  TIME_ATTACK_MS,
  TimeAttackSettings,
} from "../timeAttack";
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
} from "./canvas";

export interface TimeAttackPictureInput {
  rounds: Round[];
  settings: TimeAttackSettings;
  /** The best score with this way of answering, this run included. */
  best: number;
}

export interface TimeAttackPictureContent {
  title: string;
  subtitle: string;
  /** One square a song, right or not, as many as fit. */
  squares: boolean[];
  /** Songs past the ones drawn, as "+12", or "". */
  more: string;
  stats: Array<{ label: string; value: string }>;
}

const PER_ROW = 14;
const ROWS = 3;
const SQUARE = 36;
const GAP = 10;
const TOP = 350;

/** What the picture shows. Like the share text, it names no songs. */
export function timeAttackPictureContent({
  rounds,
  settings,
  best,
}: TimeAttackPictureInput): TimeAttackPictureContent {
  const score = rounds.filter((round) => round.didGuess).length;
  const fit = PER_ROW * ROWS;

  return {
    title: `${score} ${score === 1 ? "song" : "songs"} in ${formatClock(
      TIME_ATTACK_MS
    )}`,
    subtitle: `${answersLabel(settings.answers)} · ${settings.clip}s clips${
      settings.randomStart ? " · random start" : ""
    }`,
    squares: rounds.slice(0, fit).map((round) => round.didGuess),
    more: rounds.length > fit ? `+${rounds.length - fit}` : "",
    stats: [
      { label: "Right", value: `${score}/${rounds.length}` },
      { label: "Best", value: String(best) },
    ],
  };
}

export function drawTimeAttackPicture(
  ctx: CanvasRenderingContext2D,
  content: TimeAttackPictureContent,
  images: PictureImages
): void {
  drawFrame(ctx, images, "TIME ATTACK");

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = COLORS.navy;
  fitText(ctx, content.title, LEFT, 262, RIGHT - LEFT, "800", 52);

  ctx.fillStyle = COLORS.muted;
  ctx.font = `600 28px ${FONT}`;
  ctx.fillText(content.subtitle, LEFT, 308);

  content.squares.forEach((right, index) => {
    const x = LEFT + (index % PER_ROW) * (SQUARE + GAP);
    const y = TOP + Math.floor(index / PER_ROW) * (SQUARE + GAP);
    ctx.fillStyle = right ? COLORS.green : COLORS.red;
    roundedRect(ctx, x, y, SQUARE, SQUARE, 8);
    ctx.fill();
  });

  if (content.more) {
    const rows = Math.ceil(content.squares.length / PER_ROW);
    ctx.fillStyle = COLORS.muted;
    ctx.font = `700 22px ${FONT}`;
    ctx.fillText(content.more, LEFT, TOP + rows * (SQUARE + GAP) + 20);
  }

  // The stats stand to the right of the squares, one above the other.
  const statsLeft = LEFT + PER_ROW * (SQUARE + GAP) + 40;
  content.stats.forEach(({ label, value }, index) => {
    const top = TOP - 14 + index * 86;
    ctx.textAlign = "left";
    ctx.fillStyle = COLORS.navy;
    fitText(ctx, value, statsLeft, top + 40, RIGHT - statsLeft, "800", 44);
    ctx.fillStyle = COLORS.muted;
    ctx.font = `700 18px ${FONT}`;
    ctx.fillText(label.toUpperCase(), statsLeft, top + 64);
  });

  const bottom = PANEL.y + PANEL.height - 40;
  ctx.textAlign = "left";
  ctx.fillStyle = COLORS.blue;
  fitText(ctx, "How many can you name?", LEFT, bottom - 8, 700, "800", 34);

  drawAddress(ctx, bottom - 8);
}

/** Draws the picture as a PNG. Fails only if the browser has no canvas. */
export function makeTimeAttackPicture(
  input: TimeAttackPictureInput,
  sources: { backdrop: string; logo: string }
): Promise<Blob> {
  const content = timeAttackPictureContent(input);
  return makePicture(sources, (ctx, images) =>
    drawTimeAttackPicture(ctx, content, images)
  );
}

export function timeAttackPictureName(now: Date = new Date()): string {
  return `baheardle-timeattack-${dateStamp(now)}.png`;
}
