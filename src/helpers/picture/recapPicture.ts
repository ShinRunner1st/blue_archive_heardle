import { GameMode } from "../../types/mode";
import { StatsTally } from "../../types/stats";
import { dateStamp } from "../daily";
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

/** A mode's record, as the stats pop-up has it. */
export interface RecapStats {
  mode: GameMode;
  tally: StatsTally;
  /** The mode's run now: daily's day streak, or wins in a row. */
  current: number;
  /** The longest that run has been. */
  best: number;
  /** Songs guessed right at least once, in the modes that earn badges. */
  songsGuessed: number;
  songsTotal: number;
  badgesEarned: number;
  badgesTotal: number;
}

export interface RecapPictureContent {
  tag: string;
  title: string;
  subtitle: string;
  tiles: Array<{ label: string; value: string }>;
  /** Wins by try count, 1 to 6 (or just wins, for four-choice), then losses. */
  bars: Array<{ label: string; count: number; lost?: boolean }>;
  footer: string;
}

/**
 * What the recap shows. Only counts, never a song, so a daily recap can't
 * spoil a puzzle either.
 */
export function recapPictureContent(
  stats: RecapStats,
  now: Date = new Date()
): RecapPictureContent {
  const { mode, tally } = stats;
  const played = tally[7];
  const wins = played - tally[0];
  const rate = played > 0 ? Math.round((wins / played) * 100) : 0;
  const isDaily = mode === "daily";
  const isChoice = mode === "choice";

  return {
    tag: isDaily
      ? "DAILY RECAP"
      : isChoice
      ? "4-CHOICE RECAP"
      : "ENDLESS RECAP",
    title: "Schale activity report",
    subtitle: `As of ${now.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })}`,
    tiles: [
      { label: isDaily ? "Puzzles" : "Rounds", value: String(played) },
      { label: "Win rate", value: `${rate}%` },
      {
        label: isDaily ? "Day streak" : "Win streak",
        value: String(stats.current),
      },
      { label: "Best streak", value: String(stats.best) },
    ],
    bars: [
      // Four-choice has one try: right, or not.
      ...(isChoice ? [1] : [1, 2, 3, 4, 5, 6]).map((tries) => ({
        label: isChoice ? "✓" : String(tries),
        count: tally[tries],
      })),
      { label: "X", count: tally[0], lost: true },
    ],
    footer: `Songs guessed ${stats.songsGuessed}/${stats.songsTotal} · OST badges ${stats.badgesEarned}/${stats.badgesTotal}`,
  };
}

const TOP = 336;
const TILE_WIDTH = 216;
const TILE_HEIGHT = 88;
const TILE_GAP = 12;
const BARS_LEFT = LEFT + 2 * TILE_WIDTH + TILE_GAP + 50;
const BAR_ROW = 27;

export function drawRecapPicture(
  ctx: CanvasRenderingContext2D,
  content: RecapPictureContent,
  images: PictureImages
): void {
  drawFrame(ctx, images, content.tag);

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = COLORS.navy;
  fitText(ctx, content.title, LEFT, 262, RIGHT - LEFT, "800", 52);

  ctx.fillStyle = COLORS.muted;
  ctx.font = `600 28px ${FONT}`;
  ctx.fillText(content.subtitle, LEFT, 308);

  // Four tiles, two by two, on the left.
  content.tiles.forEach(({ label, value }, index) => {
    const x = LEFT + (index % 2) * (TILE_WIDTH + TILE_GAP);
    const y = TOP + Math.floor(index / 2) * (TILE_HEIGHT + TILE_GAP);

    ctx.fillStyle = COLORS.unused;
    roundedRect(ctx, x, y, TILE_WIDTH, TILE_HEIGHT, 16);
    ctx.fill();

    ctx.textAlign = "left";
    ctx.fillStyle = COLORS.navy;
    fitText(ctx, value, x + 20, y + 48, TILE_WIDTH - 40, "800", 38);
    ctx.fillStyle = COLORS.muted;
    ctx.font = `700 17px ${FONT}`;
    ctx.fillText(label.toUpperCase(), x + 20, y + 74);
  });

  // The guess spread on the right, as bars against the fullest row.
  const most = Math.max(1, ...content.bars.map((bar) => bar.count));
  const trackLeft = BARS_LEFT + 30;
  const trackWidth = RIGHT - 56 - trackLeft;

  content.bars.forEach(({ label, count, lost }, index) => {
    const y = TOP + index * BAR_ROW;

    ctx.textAlign = "center";
    ctx.fillStyle = COLORS.muted;
    ctx.font = `800 20px ${FONT}`;
    ctx.fillText(label, BARS_LEFT + 8, y + 19);

    ctx.fillStyle = COLORS.unused;
    roundedRect(ctx, trackLeft, y + 3, trackWidth, 20, 6);
    ctx.fill();

    if (count > 0) {
      ctx.fillStyle = lost ? COLORS.red : COLORS.green;
      roundedRect(
        ctx,
        trackLeft,
        y + 3,
        Math.max((count / most) * trackWidth, 20),
        20,
        6
      );
      ctx.fill();
    }

    ctx.textAlign = "right";
    ctx.fillStyle = COLORS.navy;
    ctx.font = `800 20px ${FONT}`;
    ctx.fillText(String(count), RIGHT, y + 20);
  });

  const bottom = PANEL.y + PANEL.height - 38;
  ctx.textAlign = "left";
  ctx.fillStyle = COLORS.blue;
  fitText(ctx, content.footer, LEFT, bottom, 640, "800", 26);

  drawAddress(ctx, bottom);
}

/** Draws the recap as a PNG. Fails only if the browser has no canvas. */
export function makeRecapPicture(
  stats: RecapStats,
  sources: { backdrop: string; logo: string }
): Promise<Blob> {
  const content = recapPictureContent(stats);
  return makePicture(sources, (ctx, images) =>
    drawRecapPicture(ctx, content, images)
  );
}

export function recapPictureName(
  mode: GameMode,
  now: Date = new Date()
): string {
  return `baheardle-${mode}-recap-${dateStamp(now)}.png`;
}
