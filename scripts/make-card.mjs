/**
 * Makes a picture for one of the hub's game cards from one of the game's
 * scenario backgrounds: cut to the card's shape, 720x320, sharp, since the
 * card's own shading keeps its words readable over it.
 *
 *   node scripts/make-card.mjs <BG name> <output.webp> [focus]
 *   node scripts/make-card.mjs Stage pictures/hub/ost.webp 0.5
 *
 * `focus` (0 to 1, the middle by default) is where the cut sits, from the
 * top of the picture to its bottom. The background is downloaded from the
 * Blue Archive wiki once, here, never by the game. Needs ffmpeg on the PATH,
 * built with libwebp. Run `npm run songs` afterwards to put the picture on
 * the Worker.
 */
import { execFile } from "node:child_process";
import { mkdtempSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

import { downloadBackground } from "./lib/wiki.mjs";

const run = promisify(execFile);

/** Twice the widest card on a phone, at the cards' shape. */
const WIDTH = 720;
const HEIGHT = 320;
/** About 30 KB each: the card shows it whole, so detail is kept. */
const QUALITY = 62;

const [name, output, focusArg = "0.5"] = process.argv.slice(2);
const focus = Number(focusArg);
if (!name || !output || !(focus >= 0 && focus <= 1)) {
  console.error(
    "Usage: node scripts/make-card.mjs <BG name> <output.webp> [focus 0-1]"
  );
  process.exit(1);
}

const dir = mkdtempSync(join(tmpdir(), "card-"));
try {
  const source = join(dir, "source.jpg");
  await downloadBackground(name, source);

  const cut = `scale=${WIDTH}:-2,crop=${WIDTH}:${HEIGHT}:0:(ih-${HEIGHT})*${focus}`;
  await run("ffmpeg", [
    ...["-v", "error", "-y", "-i", source, "-vf", `${cut},format=rgb24`],
    ...["-c:v", "libwebp", "-quality", String(QUALITY), "-map_metadata", "-1"],
    output,
  ]);

  const kb = (statSync(output).size / 1024).toFixed(1);
  console.log(`${output}: ${kb} KB`);
} finally {
  rmSync(dir, { recursive: true, force: true });
}
