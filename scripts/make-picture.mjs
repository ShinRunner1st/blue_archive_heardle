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

/** Each kind's size and WebP quality. */
const KINDS = {
  scene: { width: 960, height: 540, quality: 70 },
  cover: { width: 256, height: 256, quality: 82 },
};

const [from, kind, output] = process.argv.slice(2);
if (!from || !(kind in KINDS) || !output) {
  console.error(
    "Usage: node scripts/make-picture.mjs <file or BG name> <scene|cover> <output.webp>"
  );
  process.exit(1);
}

const { width, height, quality } = KINDS[kind];
const dir = mkdtempSync(join(tmpdir(), "picture-"));
try {
  const source = join(dir, "source");
  if (existsSync(from)) copyFileSync(from, source);
  else await downloadBackground(from, source);

  await run("ffmpeg", [
    ...["-v", "error", "-y", "-i", source, "-frames:v", "1", "-vf"],
    `scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height},format=rgba`,
    ...["-c:v", "libwebp", "-quality", String(quality), "-map_metadata", "-1"],
    output,
  ]);
  const kb = (statSync(output).size / 1024).toFixed(1);
  console.log(`${output}: ${kb} KB`);
} finally {
  rmSync(dir, { recursive: true, force: true });
}
