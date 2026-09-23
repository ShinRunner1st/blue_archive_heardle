import { readFileSync } from "node:fs";

const SONGS_PATH = "src/constants/songs.ts";

/**
 * Reads the song list out of the TypeScript source.
 *
 * The array is sliced out by its brackets rather than by stripping a prefix:
 * the declaration is not always the first thing in the file (a leading comment
 * already broke this once), and this survives reformatting. The array is a
 * plain literal with no type syntax, so evaluating it is both accurate and
 * immune to reformatting - unlike converting it to JSON with regexes. The
 * input is a checked-in file in this repo.
 */
export function loadSongs() {
  const source = readFileSync(SONGS_PATH, "utf8");

  const start = source.indexOf("[");
  const end = source.lastIndexOf("]");

  if (start === -1 || end <= start) {
    throw new Error(`Could not find the song array in ${SONGS_PATH}`);
  }

  const songs = new Function(`return ${source.slice(start, end + 1)}`)();

  if (!Array.isArray(songs) || songs.length === 0) {
    throw new Error("Parsed no songs - the song list format has changed");
  }

  // A silent partial parse would look like a healthy short list, so check the
  // shape rather than trusting the count.
  const malformed = songs.find(
    (song) =>
      typeof song?.themeNo !== "string" ||
      !song.themeNo
  );

  if (malformed) {
    throw new Error(
      `Song entry is missing its themeNo: ${JSON.stringify(malformed)}`
    );
  }

  const seen = new Set();
  const duplicate = songs.find((song) => {
    if (seen.has(song.themeNo)) return true;
    seen.add(song.themeNo);
    return false;
  });

  if (duplicate) {
    throw new Error(`Duplicate themeNo in the song list: ${duplicate.themeNo}`);
  }

  return songs;
}
