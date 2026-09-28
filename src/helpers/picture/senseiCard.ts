import { portraitFiles } from "../../constants/portraitFiles";
import { Student } from "../../types/student";
import { audioBaseUrl, backupUrlFor } from "../audioUrl";
import { dateStamp } from "../daily";
import { SenseiStats } from "../senseiStats";
import {
  canvasToBlob,
  COLORS,
  drawBackdrop,
  fitText,
  FONT,
  loadFonts,
  loadImage,
  roundedRect,
} from "./canvas";

/** A card's shape, like a licence: about 85.6 by 54 mm. */
export const CARD_WIDTH = 1200;
export const CARD_HEIGHT = 756;

const CARD = { x: 60, y: 48, width: 1080, height: 660 };
const BAND = 112;
const PHOTO = { x: 100, y: 200, width: 240, height: 271 };
const RIGHT_COLUMN = 392;

export interface SenseiCardInput {
  stats: SenseiStats;
  /** The player's name from Settings, or "" for none. */
  name: string;
  favourite: Student | null;
  issued: Date;
}

export interface SenseiCardContent {
  name: string;
  favourite: string;
  issued: string;
  since: string | null;
  tiles: Array<{ label: string; value: string }>;
  footer: string;
  /** The stripes along the bottom, like a licence's code, from the name. */
  stripes: number[];
}

function longDate(date: Date): string {
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Widths for the code stripes: the same name always draws the same code. */
function stripesFor(text: string): number[] {
  let hash = 2166136261;
  const widths: number[] = [];
  for (let i = 0; i < 40; i++) {
    hash ^= text.charCodeAt(i % Math.max(text.length, 1)) + i;
    hash = Math.imul(hash, 16777619) >>> 0;
    widths.push(2 + (hash % 5));
  }
  return widths;
}

/** What goes on the card, worked out apart from drawing so it can be tested. */
export function senseiCardContent({
  stats,
  name,
  favourite,
  issued,
}: SenseiCardInput): SenseiCardContent {
  const shown = name.trim();
  // Players are Sensei in Blue Archive; one who wrote it already keeps theirs.
  const fullName = !shown
    ? "Sensei"
    : /^sensei(\s|$)/i.test(shown)
    ? shown
    : `Sensei ${shown}`;

  return {
    name: fullName,
    favourite: favourite?.name ?? "Not picked yet",
    issued: longDate(issued),
    since: stats.since ? longDate(stats.since) : null,
    tiles: [
      {
        label: "OST songs",
        value: `${stats.songsGuessed}/${stats.songsTotal}`,
      },
      {
        label: "OST badges",
        value: `${stats.badgesEarned}/${stats.badgesTotal}`,
      },
      {
        label: "Students found",
        value: `${stats.studentsFound}/${stats.studentsTotal}`,
      },
      { label: "Best daily streak", value: String(stats.bestDailyStreak) },
      { label: "Best win streak", value: String(stats.bestWinStreak) },
      { label: "Time Attack best", value: String(stats.timeAttackBest) },
    ],
    footer: `${stats.roundsPlayed} ${
      stats.roundsPlayed === 1 ? "round" : "rounds"
    } played`,
    stripes: stripesFor(fullName),
  };
}

function label(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number
) {
  ctx.fillStyle = COLORS.muted;
  ctx.font = `800 15px ${FONT}`;
  ctx.textAlign = "left";
  ctx.fillText(text.toUpperCase(), x, y);
}

/** The portrait, cropped to fill the photo like CSS's `cover`. */
function drawPhoto(
  ctx: CanvasRenderingContext2D,
  portrait: HTMLImageElement | null
) {
  const { x, y, width, height } = PHOTO;

  // A white mount round the photo, with a soft shadow.
  ctx.save();
  ctx.shadowColor = "rgba(20, 40, 80, 0.25)";
  ctx.shadowBlur = 16;
  ctx.shadowOffsetY = 4;
  ctx.fillStyle = COLORS.white;
  roundedRect(ctx, x - 8, y - 8, width + 16, height + 16, 20);
  ctx.fill();
  ctx.restore();

  ctx.save();
  roundedRect(ctx, x, y, width, height, 14);
  ctx.clip();
  ctx.fillStyle = "#DCE6F0";
  ctx.fillRect(x, y, width, height);
  if (portrait && portrait.naturalWidth > 0) {
    const scale = Math.max(
      width / portrait.naturalWidth,
      height / portrait.naturalHeight
    );
    const drawnWidth = portrait.naturalWidth * scale;
    const drawnHeight = portrait.naturalHeight * scale;
    ctx.drawImage(
      portrait,
      x + (width - drawnWidth) / 2,
      y + (height - drawnHeight) / 2,
      drawnWidth,
      drawnHeight
    );
  } else {
    ctx.fillStyle = COLORS.muted;
    ctx.font = `800 110px ${FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("?", x + width / 2, y + height / 2);
    ctx.textBaseline = "alphabetic";
  }
  ctx.restore();
}

export function drawSenseiCard(
  ctx: CanvasRenderingContext2D,
  content: SenseiCardContent,
  images: {
    backdrop: HTMLImageElement | null;
    logo: HTMLImageElement | null;
    portrait: HTMLImageElement | null;
  }
): void {
  drawBackdrop(ctx, images.backdrop, CARD_WIDTH, CARD_HEIGHT);
  const { x, y, width, height } = CARD;
  const right = x + width - 40;

  // The card, pale blue towards the bottom.
  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.4)";
  ctx.shadowBlur = 34;
  ctx.shadowOffsetY = 12;
  const body = ctx.createLinearGradient(0, y, 0, y + height);
  body.addColorStop(0, "#FFFFFF");
  body.addColorStop(1, "#E6F0FB");
  ctx.fillStyle = body;
  roundedRect(ctx, x, y, width, height, 32);
  ctx.fill();
  ctx.restore();

  ctx.save();
  roundedRect(ctx, x, y, width, height, 32);
  ctx.clip();

  // A faint halo in the corner, like Schale's emblem.
  ctx.strokeStyle = "rgba(18, 138, 250, 0.07)";
  for (const [radius, lineWidth] of [
    [230, 26],
    [150, 12],
  ]) {
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    ctx.arc(x + width - 120, y + height - 70, radius, 0, Math.PI * 2);
    ctx.stroke();
  }

  // The blue band across the top.
  const band = ctx.createLinearGradient(x, 0, x + width, 0);
  band.addColorStop(0, COLORS.blue);
  band.addColorStop(1, "#45B8FF");
  ctx.fillStyle = band;
  ctx.fillRect(x, y, width, BAND);
  ctx.restore();

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = COLORS.white;
  ctx.font = `800 46px ${FONT}`;
  ctx.fillText("SCHALE", 100, y + 62);
  ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
  ctx.font = `800 19px ${FONT}`;
  ctx.fillText("SENSEI LICENCE · KIVOTOS", 102, y + 92);

  const { logo } = images;
  if (logo && logo.naturalWidth > 0) {
    const logoHeight = 78;
    const logoWidth = (logo.naturalWidth / logo.naturalHeight) * logoHeight;
    ctx.drawImage(
      logo,
      right - logoWidth,
      y + (BAND - logoHeight) / 2,
      logoWidth,
      logoHeight
    );
  }

  drawPhoto(ctx, images.portrait);
  label(ctx, "Favourite student", PHOTO.x, PHOTO.y + PHOTO.height + 40);
  ctx.fillStyle = COLORS.navy;
  fitText(
    ctx,
    content.favourite,
    PHOTO.x,
    PHOTO.y + PHOTO.height + 74,
    PHOTO.width + 20,
    "800",
    28
  );

  // The holder: name, and when the card was made.
  label(ctx, "Name", RIGHT_COLUMN, y + 168);
  ctx.fillStyle = COLORS.navy;
  fitText(
    ctx,
    content.name,
    RIGHT_COLUMN,
    y + 218,
    right - RIGHT_COLUMN,
    "800",
    50
  );

  label(ctx, "Issued", RIGHT_COLUMN, y + 262);
  ctx.fillStyle = COLORS.navy;
  ctx.font = `700 24px ${FONT}`;
  ctx.fillText(content.issued, RIGHT_COLUMN, y + 292);
  if (content.since) {
    label(ctx, "Sensei since", RIGHT_COLUMN + 240, y + 262);
    ctx.fillStyle = COLORS.navy;
    ctx.font = `700 24px ${FONT}`;
    ctx.fillText(content.since, RIGHT_COLUMN + 240, y + 292);
  }

  // The record, three by two.
  const tileWidth = (right - RIGHT_COLUMN - 24) / 3;
  const tileHeight = 104;
  content.tiles.forEach((tile, index) => {
    const tileX = RIGHT_COLUMN + (index % 3) * (tileWidth + 12);
    const tileY = y + 322 + Math.floor(index / 3) * (tileHeight + 12);
    ctx.fillStyle = "rgba(18, 138, 250, 0.09)";
    roundedRect(ctx, tileX, tileY, tileWidth, tileHeight, 16);
    ctx.fill();
    ctx.fillStyle = COLORS.navy;
    ctx.textAlign = "left";
    fitText(ctx, tile.value, tileX + 18, tileY + 52, tileWidth - 36, "800", 38);
    label(ctx, tile.label, tileX + 18, tileY + 82);
  });

  // Along the bottom: the code stripes, the rounds, the address.
  const bottom = y + height - 40;
  let stripeX = 100;
  ctx.fillStyle = COLORS.navy;
  content.stripes.forEach((stripe, index) => {
    if (index % 2 === 0) ctx.fillRect(stripeX, bottom - 34, stripe, 34);
    stripeX += stripe + 2;
  });

  ctx.textAlign = "left";
  ctx.fillStyle = COLORS.muted;
  ctx.font = `700 22px ${FONT}`;
  ctx.fillText(content.footer, RIGHT_COLUMN, bottom - 6);

  ctx.textAlign = "right";
  ctx.fillStyle = COLORS.blue;
  ctx.font = `800 26px ${FONT}`;
  ctx.fillText("baheardle.com", right, bottom - 6);
}

/** A student's portrait on the Worker, from its copy on R2 if need be. */
async function loadPortrait(id: number): Promise<HTMLImageElement | null> {
  const file = portraitFiles[`portraits/${id}`];
  if (!file) return null;
  const url = `${audioBaseUrl()}/${file}`;
  const image = await loadImage(url);
  if (image) return image;
  const backup = backupUrlFor(url);
  return backup ? loadImage(backup) : null;
}

/** Draws the card as a PNG. Fails only if the browser has no canvas. */
export async function makeSenseiCard(
  input: SenseiCardInput,
  sources: { backdrop: string; logo: string }
): Promise<Blob> {
  const [backdrop, logo, portrait] = await Promise.all([
    loadImage(sources.backdrop),
    loadImage(sources.logo),
    input.favourite ? loadPortrait(input.favourite.id) : null,
    loadFonts(),
  ]);

  const canvas = document.createElement("canvas");
  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("This browser can't draw pictures");

  drawSenseiCard(ctx, senseiCardContent(input), { backdrop, logo, portrait });
  return canvasToBlob(canvas);
}

export function senseiCardName(now: Date = new Date()): string {
  return `baheardle-sensei-card-${dateStamp(now)}.png`;
}
