/**
 * Drawing pieces shared by the pictures players can share: the result picture
 * now, the recap card later. Everything is drawn in the browser from pictures
 * the page has already loaded, so making one costs no requests.
 */

/** 16:9, which X shows whole in the timeline without cropping. */
export const PICTURE_WIDTH = 1200;
export const PICTURE_HEIGHT = 675;

export const FONT = '"Nunito Sans Variable", "Nunito Sans", sans-serif';

/** Blue Archive's own UI: white panels, navy text, its bright blue. */
export const COLORS = {
  panel: "rgba(255, 255, 255, 0.95)",
  navy: "#2B3A55",
  muted: "#6B7A90",
  blue: "#128AFA",
  green: "#4DBB60",
  red: "#FF4D4D",
  skipped: "#4A5160",
  unused: "#E3E8EF",
  white: "#FFFFFF",
};

/** A picture ready to draw, or null if it wouldn't load. */
export function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
  });
}

/**
 * Canvas text only uses a web font once it has loaded, and falls back without
 * saying so, so the weights the pictures use are asked for first.
 */
export async function loadFonts(): Promise<void> {
  try {
    await Promise.all(
      ["600", "700", "800"].map((weight) =>
        document.fonts.load(`${weight} 32px ${FONT}`)
      )
    );
  } catch {
    // The fallback font is fine.
  }
}

/** Traced by hand: ctx.roundRect is missing on older Safari. */
export function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): void {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

/**
 * The page's backdrop, cropped to fill the picture like CSS's `cover`, and
 * dimmed a little so the panel stands out. A plain navy if it didn't load.
 */
export function drawBackdrop(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement | null
): void {
  ctx.fillStyle = COLORS.navy;
  ctx.fillRect(0, 0, PICTURE_WIDTH, PICTURE_HEIGHT);

  if (image && image.naturalWidth > 0) {
    const scale = Math.max(
      PICTURE_WIDTH / image.naturalWidth,
      PICTURE_HEIGHT / image.naturalHeight
    );
    const width = image.naturalWidth * scale;
    const height = image.naturalHeight * scale;
    ctx.drawImage(
      image,
      (PICTURE_WIDTH - width) / 2,
      (PICTURE_HEIGHT - height) / 2,
      width,
      height
    );
  }

  ctx.fillStyle = "rgba(10, 16, 30, 0.3)";
  ctx.fillRect(0, 0, PICTURE_WIDTH, PICTURE_HEIGHT);
}

/** The white panel everything else sits on, with a soft shadow. */
export function drawPanel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number
): void {
  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.35)";
  ctx.shadowBlur = 30;
  ctx.shadowOffsetY = 10;
  ctx.fillStyle = COLORS.panel;
  roundedRect(ctx, x, y, width, height, 28);
  ctx.fill();
  ctx.restore();
}

/**
 * A slanted blue tag, like the labels in Blue Archive's menus, ending at
 * `right`. Returns its left edge.
 */
export function drawTag(
  ctx: CanvasRenderingContext2D,
  text: string,
  right: number,
  top: number
): number {
  const height = 52;
  const slant = 14;
  ctx.font = `800 28px ${FONT}`;
  const width = ctx.measureText(text).width + 48;
  const left = right - width;

  ctx.fillStyle = COLORS.blue;
  ctx.beginPath();
  ctx.moveTo(left + slant, top);
  ctx.lineTo(right, top);
  ctx.lineTo(right - slant, top + height);
  ctx.lineTo(left, top + height);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = COLORS.white;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, left + width / 2, top + height / 2 + 1);
  return left;
}

/**
 * Writes a line no wider than `maxWidth`: the font shrinks down to `minSize`,
 * then the end is cut off with an ellipsis. Song names can be long.
 */
export function fitText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  weight: string,
  size: number,
  minSize = Math.round(size * 0.7)
): void {
  let current = size;
  ctx.font = `${weight} ${current}px ${FONT}`;
  while (ctx.measureText(text).width > maxWidth && current > minSize) {
    current -= 2;
    ctx.font = `${weight} ${current}px ${FONT}`;
  }

  if (ctx.measureText(text).width <= maxWidth) {
    ctx.fillText(text, x, y);
    return;
  }

  let cut = text;
  while (
    cut.length > 1 &&
    ctx.measureText(`${cut.trimEnd()}…`).width > maxWidth
  ) {
    cut = cut.slice(0, -1);
  }
  ctx.fillText(`${cut.trimEnd()}…`, x, y);
}

/** Emoji draw differently on every device, so the pictures leave them out. */
export function withoutEmoji(text: string): string {
  return text
    .replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("The picture was empty")),
      "image/png"
    );
  });
}

/** The pictures every card draws on; either may be missing. */
export interface PictureImages {
  backdrop: HTMLImageElement | null;
  logo: HTMLImageElement | null;
}

/** Where the white panel sits, and the margins the content keeps inside it. */
export const PANEL = { x: 70, y: 56, width: 1060, height: 563 };
export const CONTENT_LEFT = 110;
export const CONTENT_RIGHT = PANEL.x + PANEL.width - 40;

/**
 * What every card shares: the backdrop, the white panel, the logo at the top
 * left and the blue tag at the top right.
 */
export function drawFrame(
  ctx: CanvasRenderingContext2D,
  { backdrop, logo }: PictureImages,
  tag: string
): void {
  drawBackdrop(ctx, backdrop);
  drawPanel(ctx, PANEL.x, PANEL.y, PANEL.width, PANEL.height);

  if (logo && logo.naturalWidth > 0) {
    const height = 96;
    const width = (logo.naturalWidth / logo.naturalHeight) * height;
    ctx.drawImage(logo, CONTENT_LEFT - 10, PANEL.y + 26, width, height);
  }
  drawTag(ctx, tag, CONTENT_RIGHT, PANEL.y + 44);
}

/** The site's address at the bottom right, on every card. */
export function drawAddress(ctx: CanvasRenderingContext2D, y: number): void {
  ctx.fillStyle = COLORS.navy;
  ctx.font = `800 26px ${FONT}`;
  ctx.textAlign = "right";
  ctx.fillText("baheardle.com", CONTENT_RIGHT, y);
}

/**
 * Loads what a card needs, draws it and returns the PNG. Fails only if the
 * browser has no canvas.
 */
export async function makePicture(
  sources: { backdrop: string; logo: string },
  draw: (ctx: CanvasRenderingContext2D, images: PictureImages) => void
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

  draw(ctx, { backdrop, logo });
  return canvasToBlob(canvas);
}
