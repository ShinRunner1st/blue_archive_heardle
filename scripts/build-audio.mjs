/**
 * Builds the audio the game serves from the originals in audio/.
 *
 * For every song in the list it writes two files to audio-dist/, named so a
 * request says nothing about the song (see src/helpers/audioFiles.ts):
 * - the whole song, copied as is;
 * - its clip, CLIP_SECONDS cut from a fixed point - all a round downloads.
 * It also writes src/constants/audioClips.ts - where each clip starts, how
 * long each song is, and each song's version - and audio-dist/_headers, which
 * lets browsers keep every file for good. `npm run upload:audio` then puts
 * audio-dist/ on Cloudflare, with the pictures build-pictures copies into
 * audio-dist/pictures/.
 *
 * Run `npm run songs` after adding or replacing an original. Needs ffmpeg and
 * ffprobe on the PATH. A song whose original hasn't changed is skipped. The
 * cuts are byte-for-byte repeatable, and anything else in audio-dist/ (but the
 * pictures folder) is removed, so an old name can't linger there.
 */
import { execFile } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { cpus } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

import {
  CLIP_SECONDS,
  clipFile,
  clipPosition,
  songFile,
  sourceFile,
} from "../src/helpers/audioFiles.ts";
import {
  MANIFEST_PATH,
  OUTPUT_DIR,
  SOURCE_DIR,
  loadManifest,
  versionOf,
  writeHeaders,
} from "./lib/audio.mjs";
import { loadSongs } from "./lib/songs.mjs";

const run = promisify(execFile);

async function checkTools() {
  try {
    await run("ffmpeg", ["-version"]);
    await run("ffprobe", ["-version"]);
  } catch {
    console.error(
      "ffmpeg and ffprobe are needed on the PATH: https://ffmpeg.org/download.html"
    );
    process.exit(1);
  }
}

async function durationOf(path) {
  const { stdout } = await run("ffprobe", [
    ...["-v", "error", "-show_entries", "format=duration"],
    ...["-of", "csv=p=0", path],
  ]);
  const seconds = Number(stdout.trim());
  if (!Number.isFinite(seconds) || seconds <= 0) {
    throw new Error(`Could not read the length of ${path}`);
  }
  return seconds;
}

const round2 = (n) => Math.round(n * 100) / 100;

let rebuilt = 0;

async function build(song, previous) {
  const source = join(SOURCE_DIR, sourceFile(song.themeNo));
  const v = versionOf(source);
  const clip = join(OUTPUT_DIR, clipFile(song.themeNo, v));
  const whole = join(OUTPUT_DIR, songFile(song.themeNo, v));

  // Same original, already built: nothing to do.
  if (previous?.v === v && existsSync(clip) && existsSync(whole)) {
    return previous;
  }

  const duration = await durationOf(source);
  const start = round2(
    clipPosition(song.themeNo) * Math.max(duration - CLIP_SECONDS, 0)
  );

  copyFileSync(source, whole);

  // Stream copy: no re-encoding, so no loss, and the same bytes every run.
  // Metadata is dropped in case a file ever carries a title tag.
  await run("ffmpeg", [
    ...["-v", "error", "-y", "-ss", String(start), "-t", String(CLIP_SECONDS)],
    ...["-i", source, "-map", "0:a", "-c", "copy"],
    ...["-map_metadata", "-1", "-fflags", "+bitexact"],
    clip,
  ]);

  rebuilt += 1;
  return { themeNo: song.themeNo, start, duration: round2(duration), v };
}

/** Runs `task` over `items`, a few at a time. */
async function inPool(items, task) {
  const results = [];
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await task(items[index]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(cpus().length, 8) }, worker));
  return results;
}

function render(entries) {
  const lines = entries.map(
    ({ themeNo, start, duration, v }) =>
      `  "${themeNo}": { start: ${start}, duration: ${duration}, v: "${v}" },`
  );
  return `/**
 * Where each song's clip starts and how long the song is, in seconds, and the
 * version its audio file names carry, by theme number. The result screen uses
 * it to mark the clip on the whole song.
 *
 * GENERATED FILE - do not edit by hand. Run \`npm run songs\`.
 */
export const audioClips: Record<
  string,
  { start: number; duration: number; v: string }
> = {
${lines.join("\n")}
};
`;
}

await checkTools();

const songs = loadSongs();
const missing = songs.filter(
  (song) => !existsSync(join(SOURCE_DIR, sourceFile(song.themeNo)))
);
if (missing.length > 0) {
  console.error(
    `${missing.length} song(s) have no original in ${SOURCE_DIR}/:`
  );
  for (const song of missing) {
    console.error(
      `  ${sourceFile(song.themeNo)}  (${song.artist} - ${song.name})`
    );
  }
  process.exit(1);
}

mkdirSync(OUTPUT_DIR, { recursive: true });
const manifest = loadManifest();
const entries = await inPool(songs, (song) =>
  build(song, manifest.get(song.themeNo))
);

// Anything else in the output is stale: a removed or replaced song.
const expected = new Set([
  "_headers",
  "pictures",
  ...entries.flatMap(({ themeNo, v }) => [
    clipFile(themeNo, v),
    songFile(themeNo, v),
  ]),
]);
const stale = readdirSync(OUTPUT_DIR).filter((file) => !expected.has(file));
for (const file of stale) rmSync(join(OUTPUT_DIR, file));

writeHeaders(OUTPUT_DIR);
writeFileSync(MANIFEST_PATH, render(entries));

const known = new Set(songs.map((song) => sourceFile(song.themeNo)));
const unused = readdirSync(SOURCE_DIR).filter(
  (file) => file.endsWith(".ogg") && !known.has(file)
);

console.log(
  `${songs.length} songs in ${OUTPUT_DIR}: ${rebuilt} built, ${
    songs.length - rebuilt
  } unchanged.`
);
if (stale.length > 0) console.log(`Removed ${stale.length} stale file(s).`);
if (unused.length > 0) {
  console.warn(`\n${unused.length} original(s) with no song entry yet:`);
  for (const file of unused) console.warn(`  ${file}`);
}
