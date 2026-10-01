/**
 * Adds the soundtrack's new tracks to the song list: each new track's file
 * goes into audio/ as Theme_<n>.ogg, from the game's files downloaded with
 * BA-AD (scripts/lib/gameTracks.mjs; BAAD_OUTPUT points at a download of
 * your own) or, for one the game's files don't have, from the Blue Archive
 * wiki's Music page (JP's tracklist, see scripts/lib/wikiTracks.mjs),
 * checked against the wiki's SHA-1. Its entry goes into
 * src/constants/songs.ts, with the wiki's title and artist, or "Theme <n>" by "Unknown" while the wiki has none. A
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
import { gameTracks } from "./lib/gameTracks.mjs";
import { trackChanges, WIKI_HEADERS } from "./lib/wikiTracks.mjs";

const SONGS_PATH = "src/constants/songs.ts";
const SOURCE_DIR = "audio";

// find-updates.mjs has already warned the pull request if the wiki is down.
const { added, named, wikiDown } = await trackChanges(songs, gameTracks());
if (wikiDown) console.warn(`The wiki couldn't be reached (${wikiDown}).`);

const list = songs.map((song) => ({ ...song }));
const summary = [];

/** A new track's file: the game's as it is, or the wiki's, checked. */
async function trackBytes(track) {
  if (track.path) return readFileSync(track.path);
  const response = await fetch(track.url, { headers: WIKI_HEADERS });
  if (!response.ok) {
    console.warn(`Could not download ${track.file}: left for next time.`);
    return null;
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  const sha1 = createHash("sha1").update(bytes).digest("hex");
  if (sha1 !== track.sha1) {
    console.warn(`${track.file} didn't match the wiki's SHA-1: left out.`);
    return null;
  }
  return bytes;
}

for (const track of added) {
  const bytes = await trackBytes(track);
  if (!bytes) continue;
  writeFileSync(join(SOURCE_DIR, sourceFile(track.themeNo)), bytes);
  const song = {
    artist: track.artist || "Unknown",
    name: track.title || `Theme ${track.themeNo}`,
    themeNo: track.themeNo,
  };
  list.push(song);
  const from = track.path
    ? track.variant
      ? ` (only the game's Theme_${song.themeNo}_${track.variant} exists: check it's the one)`
      : ""
    : " (from the wiki: the game's files didn't have it)";
  summary.push(
    `- New song: Theme ${song.themeNo}, "${song.name}" by ${song.artist}${from}`
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
  console.log("No new tracks in the game or on the wiki.");
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
