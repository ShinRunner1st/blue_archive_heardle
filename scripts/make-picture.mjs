/**
 * Makes a sharp picture for the Worker, or an OST badge's cover, from a
 * picture file or one of the game's scenario backgrounds (downloaded from
 * the Blue Archive wiki, as make-backdrop.mjs does). Blurred backdrops,
 * like the seasons', are make-backdrop.mjs's.
 *
 *   node scripts/make-picture.mjs <file or BG name> scene <output.webp>
 *   node scripts/make-picture.mjs vol9.png cover src/image/badges/vol9.webp
 *
 * scene: 960x540, cropped to fill, for a card's or banner's background
 * (shown at most about that wide, in the profile's head).
 * cover: 256x256, cropped to fill, like the albums' covers.
 *
 * Compressed by itself, as the site's pictures were by hand: made the size
 * it's shown at, then WebP at the lowest quality that still looks the same.
 *
 * The admin tool runs it. Needs ffmpeg on the PATH, built with libwebp; run
 * `npm run songs` afterwards to put a scene on the Worker.
 */
import { execFile } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdtempSync,
  rmSync,
  statSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

import { downloadBackground } from "./lib/wiki.mjs";

const run = promisify(execFile);

/**
 * Each kind's size, how alike the WebP must stay to the picture at that
 * size (SSIM), and the qualities searched for the lowest that does.
 *
 * Covers are flat art, shown small: 0.985, the level the icon sheets were
 * checked at (docs/plan.md), which they reach at about quality 74. Scenes
 * are detailed and shown under a tint or behind a card: a game background
 * reaches only 0.96 even at quality 92 (measured 2026-10-02: 160 KB for
 * FireplaceDormitory), so 0.95, and never past 72, about what was picked by
 * eye; a simple scene comes out much smaller.
 */
const KINDS = {
  scene: { width: 960, height: 540, same: 0.95, lowest: 40, highest: 72 },
  cover: { width: 256, height: 256, same: 0.985, lowest: 30, highest: 92 },
};

const [from, kind, output] = process.argv.slice(2);
if (!from || !(kind in KINDS) || !output) {
  console.error(
    "Usage: node scripts/make-picture.mjs <file or BG name> <scene|cover> <output.webp>"
  );
  process.exit(1);
}

/**
 * How alike two pictures are, 0 to 1, by ffmpeg's SSIM: each laid over
 * black first, so colours hidden under transparency don't count.
 */
async function ssim(a, b) {
  const flat = (input, label) =>
    `color=black:s=${width}x${height}[${label}bg];` +
    `[${input}:v]format=rgba[${label}in];` +
    `[${label}bg][${label}in]overlay=shortest=1,format=rgb24[${label}]`;
  const { stderr } = await run("ffmpeg", [
    ...["-i", a, "-i", b, "-lavfi"],
    `${flat(0, "a")};${flat(1, "b")};[a][b]ssim`,
    ...["-f", "null", "-"],
  ]);
  const match = stderr.match(/All:([\d.]+)/);
  if (!match) throw new Error("Could not compare the pictures");
  return Number(match[1]);
}

const { width, height, same, lowest, highest } = KINDS[kind];
const dir = mkdtempSync(join(tmpdir(), "picture-"));
try {
  const source = join(dir, "source");
  if (existsSync(from)) copyFileSync(from, source);
  else await downloadBackground(from, source);

  // The picture at its size, without loss: what each try is held to.
  const sized = join(dir, "sized.png");
  await run("ffmpeg", [
    ...["-v", "error", "-y", "-i", source, "-frames:v", "1", "-vf"],
    `scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height},format=rgba`,
    sized,
  ]);

  const tryQuality = async (quality) => {
    const file = join(dir, `q${quality}.webp`);
    await run("ffmpeg", [
      ...["-v", "error", "-y", "-i", sized],
      ...[
        "-c:v",
        "libwebp",
        "-quality",
        String(quality),
        "-map_metadata",
        "-1",
      ],
      file,
    ]);
    return { file, quality, ssim: await ssim(sized, file) };
  };

  // The lowest quality that still looks the same, halving the range.
  let low = lowest;
  let high = highest;
  let best = await tryQuality(high);
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    const attempt = await tryQuality(middle);
    if (attempt.ssim >= same) {
      best = attempt;
      high = middle;
    } else low = middle + 1;
  }
  copyFileSync(best.file, output);

  const summary = {
    sourceKb: Math.round(statSync(source).size / 102.4) / 10,
    kb: Math.round(statSync(output).size / 102.4) / 10,
    quality: best.quality,
    ssim: Math.round(best.ssim * 1000) / 1000,
  };
  console.log(
    `${output}: ${summary.sourceKb} KB -> ${summary.kb} KB, quality ${summary.quality}, SSIM ${summary.ssim}`
  );
  // The last line, for the admin tool.
  console.log(JSON.stringify(summary));
} finally {
  rmSync(dir, { recursive: true, force: true });
}
