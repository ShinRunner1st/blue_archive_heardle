/**
 * Verifies the audio is complete and up to date.
 *
 * Fails when a song has no original in audio/, or when audioClips.ts doesn't
 * match the originals - a song added or replaced without `npm run songs`. CI
 * runs this on every push. Originals with no song entry only get a warning:
 * they may be waiting for their entry to be added.
 *
 * With --remote it also asks both servers in .env.production, the Worker and
 * the backup on R2, for every file, so nothing goes live pointing at audio
 * that was never uploaded.
 */
import { readdirSync } from "node:fs";
import { join } from "node:path";

import { clipFile, songFile, sourceFile } from "../src/helpers/audioFiles.ts";
import {
  SOURCE_DIR,
  checkServerFile,
  loadManifest,
  loadServers,
  versionOf,
} from "./lib/audio.mjs";
import { loadSongs } from "./lib/songs.mjs";

const songs = loadSongs();
const sources = new Set(readdirSync(SOURCE_DIR));
const manifest = loadManifest();

const problems = [];

for (const song of songs) {
  const file = sourceFile(song.themeNo);
  const label = `${file}  (${song.artist} - ${song.name})`;
  const entry = manifest.get(song.themeNo);

  if (!sources.has(file)) {
    problems.push(`no original in ${SOURCE_DIR}/: ${label}`);
  } else if (!entry || entry.v !== versionOf(join(SOURCE_DIR, file))) {
    problems.push(`not built from its current original: ${label}`);
  }
}

const known = new Set(songs.map((song) => song.themeNo));
for (const themeNo of manifest.keys()) {
  if (!known.has(themeNo)) {
    problems.push(`built, but not in the song list: theme ${themeNo}`);
  }
}

async function checkRemote() {
  for (const base of loadServers(problems)) {
    const urls = [...manifest.values()].flatMap(({ themeNo, v }) => [
      `${base}/${clipFile(themeNo, v)}`,
      `${base}/${songFile(themeNo, v)}`,
    ]);
    let next = 0;
    const asker = async () => {
      while (next < urls.length) {
        const problem = await checkServerFile(urls[next++]);
        if (problem) problems.push(problem);
      }
    };
    await Promise.all(Array.from({ length: 8 }, asker));
    console.log(`Asked ${base} for ${urls.length} files.`);
  }
}

if (process.argv.includes("--remote")) await checkRemote();

const expectedSources = new Set(songs.map((song) => sourceFile(song.themeNo)));
const unused = [...sources].filter(
  (file) => file.endsWith(".ogg") && !expectedSources.has(file)
);

console.log(`Checked ${songs.length} songs.`);

if (unused.length > 0) {
  console.warn(`\n${unused.length} original(s) with no song entry:`);
  for (const file of unused) console.warn(`  ${file}`);
}

if (problems.length === 0) {
  console.log("Every song is built from its current original.");
  process.exit(0);
}

console.error(`\n${problems.length} problem(s) - run \`npm run songs\`:`);
for (const problem of problems.slice(0, 20)) console.error(`  ${problem}`);
if (problems.length > 20) {
  console.error(`  ...and ${problems.length - 20} more`);
}
process.exit(1);
