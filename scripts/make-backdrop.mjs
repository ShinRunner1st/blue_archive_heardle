/**
 * Makes a backdrop from one of the game's scenario backgrounds, the way the
 * streak places were made: 1280x900, blurred, and dimmed to a steady
 * brightness so the game reads over it.
 *
 *   node scripts/make-backdrop.mjs <BG name> <day|night> <output.webp>
 *   node scripts/make-backdrop.mjs FireplaceDormitory day pictures/seasons/christmas-day.webp
 *   node scripts/make-backdrop.mjs my-picture.png night pictures/scenes/mine-night.webp
 *
 * The background is downloaded from the Blue Archive wiki (File:BG_<name>.jpg)
 * once, here, never by the game; or, given a picture file in its place (the
 * admin tool's uploads), made from that. Needs ffmpeg on the PATH, built with libwebp.
 * Run `npm run songs` afterwards to put the picture on the Worker.
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

/** Mean brightness (0-255) the streak places were dimmed to. */
const BRIGHTNESS = { day: 89.5, night: 44.5 };
/** The streak places' blur, measured against their originals. */
const BLUR = 12;
const SIZE = "1280:900";
/** About 13 KB, like the streak places: detail is blurred away anyway. */
const QUALITY = 60;

const [name, time, output] = process.argv.slice(2);
if (!name || !(time in BRIGHTNESS) || !output) {
  console.error(
    "Usage: node scripts/make-backdrop.mjs <BG name> <day|night> <output.webp>"
  );
  process.exit(1);
}

async function meanBrightness(file, filters) {
  const { stdout } = await run("ffmpeg", [
    ...["-v", "error", "-i", file, "-vf"],
    `${filters}format=gray,signalstats,metadata=print:key=lavfi.signalstats.YAVG:file=-`,
    ...["-f", "null", "-"],
  ]);
  const match = stdout.match(/YAVG=([\d.]+)/);
  if (!match) throw new Error(`Could not measure ${file}`);
  return Number(match[1]);
}

const dir = mkdtempSync(join(tmpdir(), "backdrop-"));
try {
  const source = join(dir, "source.jpg");
  if (existsSync(name)) copyFileSync(name, source);
  else await downloadBackground(name, source);

  const blur = `scale=${SIZE},gblur=sigma=${BLUR},`;
  const k = BRIGHTNESS[time] / (await meanBrightness(source, blur));
  const dim = `colorchannelmixer=rr=${k}:gg=${k}:bb=${k},`;

  await run("ffmpeg", [
    ...["-v", "error", "-y", "-i", source, "-vf", `${blur}${dim}format=rgb24`],
    ...["-c:v", "libwebp", "-quality", String(QUALITY), "-map_metadata", "-1"],
    output,
  ]);

  const result = await meanBrightness(output, "");
  const kb = (statSync(output).size / 1024).toFixed(1);
  console.log(`${output}: ${kb} KB, brightness ${result.toFixed(1)}`);
} finally {
  rmSync(dir, { recursive: true, force: true });
}
