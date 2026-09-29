/**
 * Adds the soundtrack's new tracks to the song list, from the Blue Archive
 * wiki's Music page (JP's tracklist, see scripts/lib/wikiTracks.mjs): each
 * new track's file goes into audio/ as Theme_<n>.ogg, checked against the
 * wiki's SHA-1, and its entry into src/constants/songs.ts, with the wiki's
 * title and artist, or "Theme <n>" by "Unknown" while the wiki has none. A
 * song with either half still like that follows the wiki for both, until
 * both are filled. Nothing else in the list is touched, so names edited by
 * hand stay.
 *
 * A few tracks come from the game's files (downloaded with BA-AD) and aren't
 * on the wiki's Music page at all: 269 and 271 (the game's 269_title and
 * 271_title) and 314 (314_short). They stay "Theme N" until named by hand.
 *
 * The special tracks (10000 and up) are left out, as they always were. Run
 * `npm run songs` afterwards to build and upload the audio; the weekly
 * Action (.github/workflows/content-update.yml) does both. With
 * UPDATE_SUMMARY set, what changed is added to that file, for the pull
 * request.
 *
 *   node scripts/build-new-songs.mjs
 */
import { createHash } from "node:crypto";
import { appendFileSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { sourceFile } from "../src/helpers/audioFiles.ts";
import { songs } from "../src/constants/songs.ts";
import { trackChanges } from "./lib/wikiTracks.mjs";

const SONGS_PATH = "src/constants/songs.ts";
const SOURCE_DIR = "audio";
const HEADERS = { "User-Agent": "baheardle.com build script" };

const { added, named } = await trackChanges(songs);

const list = songs.map((song) => ({ ...song }));
const summary = [];

for (const track of added) {
  const response = await fetch(track.url, { headers: HEADERS });
  if (!response.ok) {
    console.warn(`Could not download ${track.file}: left for next time.`);
    continue;
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  const sha1 = createHash("sha1").update(bytes).digest("hex");
  if (sha1 !== track.sha1) {
    console.warn(`${track.file} didn't match the wiki's SHA-1: left out.`);
    continue;
  }
  writeFileSync(join(SOURCE_DIR, sourceFile(track.themeNo)), bytes);
  const song = {
    artist: track.artist || "Unknown",
    name: track.title || `Theme ${track.themeNo}`,
    themeNo: track.themeNo,
  };
  list.push(song);
  summary.push(
    `- New song: Theme ${song.themeNo}, "${song.name}" by ${song.artist}`
  );
}

for (const { song, name, artist } of named) {
  const entry = list.find(({ themeNo }) => themeNo === song.themeNo);
  const was = `"${entry.name}" by ${entry.artist}`;
  if (name) entry.name = name;
  if (artist) entry.artist = artist;
  summary.push(
    `- Named: Theme ${song.themeNo}, ${was}, is now "${entry.name}" by ${entry.artist}`
  );
}

if (summary.length === 0) {
  console.log("No new tracks on the wiki.");
  process.exit(0);
}

// The file as it was, its opening comment and all, with the list redone in
// theme order; the npm script runs Prettier over it afterwards.
const source = readFileSync(SONGS_PATH, "utf8");
const head = source.slice(0, source.indexOf("export const songs = ["));
list.sort((a, b) => Number(a.themeNo) - Number(b.themeNo));
const entries = list
  .map(({ artist, name, themeNo }) =>
    [
      "  {",
      `    artist: ${JSON.stringify(artist)},`,
      `    name: ${JSON.stringify(name)},`,
      `    themeNo: ${JSON.stringify(themeNo)},`,
      "  },",
    ].join("\n")
  )
  .join("\n");
writeFileSync(SONGS_PATH, `${head}export const songs = [\n${entries}\n];\n`);

console.log(summary.join("\n"));
if (process.env.UPDATE_SUMMARY) {
  appendFileSync(process.env.UPDATE_SUMMARY, `${summary.join("\n")}\n`);
}
