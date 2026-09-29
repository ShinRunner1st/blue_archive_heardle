/**
 * Downloads the game's music from JP's servers with BA-AD, into .cache/baad
 * (or BAAD_OUTPUT), for find-updates.mjs and build-new-songs.mjs to add new
 * tracks from. Needs the `baad` program on the PATH, or its path in BAAD; the
 * weekly Action installs a pinned release. Files already there with the same
 * hash are skipped.
 *
 *   BAAD=E:/BAAD/baad.exe npm run download:music
 */
import { downloadGameTracks, GAME_DIR, gameTracks } from "./lib/gameTracks.mjs";

downloadGameTracks();
console.log(`${gameTracks().size} themes in the game's files, in ${GAME_DIR}.`);
