/**
 * Verifies every song in the list has an audio file in public/audio.
 *
 * A missing file means an unplayable round, so CI runs this on every push.
 * Files with no song entry only get a warning: they are harmless, and may be
 * waiting for their entry to be added.
 *
 * The name mapping must match getAudioUrl in src/helpers/audioUrl.ts.
 */
import { readdirSync } from "node:fs";

import { loadSongs } from "./lib/songs.mjs";

const AUDIO_DIR = "public/audio";

function fileFor(themeNo) {
  return `Theme_${themeNo.padStart(2, "0")}.ogg`;
}

const songs = loadSongs();
const files = new Set(readdirSync(AUDIO_DIR));
const expected = new Set(songs.map((song) => fileFor(song.themeNo)));

const missing = songs.filter((song) => !files.has(fileFor(song.themeNo)));
const unused = [...files].filter(
  (file) => file.endsWith(".ogg") && !expected.has(file)
);

console.log(`Checked ${songs.length} songs against ${files.size} files.`);

if (unused.length > 0) {
  console.warn(`\n${unused.length} file(s) with no song entry:`);
  for (const file of unused) console.warn(`  ${file}`);
}

if (missing.length === 0) {
  console.log("Every song has its audio file.");
  process.exit(0);
}

console.error(`\n${missing.length} song(s) with no audio file:`);
for (const song of missing) {
  console.error(`  ${fileFor(song.themeNo)}  (${song.artist} - ${song.name})`);
}

process.exit(1);
