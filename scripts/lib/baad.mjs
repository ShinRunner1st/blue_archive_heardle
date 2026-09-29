/**
 * Runs BA-AD (https://github.com/Deathemonic/BA-AD), which downloads the
 * game's own files from JP's servers, and BA-AX
 * (https://github.com/Deathemonic/BA-AX), which opens the media's zips (the
 * voice lines): every file from the game goes through here. The weekly
 * Action installs a pinned release of each; locally, put `baad` and `baax`
 * on the PATH, or their paths in BAAD and BAAX.
 *
 * BA-AD skips a media file it already has with the same hash, so with these
 * folders kept between runs (the Action caches .cache/) only new files come
 * down; asset bundles it downloads again each time, which for the few the
 * scripts ask for is quick. When either can't run (not installed, the game
 * in maintenance), it says so once and returns false, and the scripts use the
 * files they already have or fall back to SchaleDB's and the Fandom wiki's,
 * as before.
 */
import { spawnSync } from "node:child_process";

/** The music and voice lines: Android's media, as players get them. */
export const MEDIA_DIR = process.env.BAAD_OUTPUT || ".cache/baad";
/** The student pictures and weapons, Android's, which are big enough. */
export const UI_DIR = ".cache/baad-ui";
/**
 * The students' sprites, for their halos: Windows', whose textures are
 * twice Android's size (2048 pixels), so a halo is as sharp as the wiki's.
 */
export const SPRITE_DIR = ".cache/baad-sprites";

/** The last line a program printed, for saying why it failed. */
const lastLine = (result) =>
  result.error?.message ??
  `${result.stdout ?? ""}\n${result.stderr ?? ""}`.trim().split("\n").pop();

let baadWarned = false;

/**
 * Downloads the game's files whose names match `filter` (a regular
 * expression) into `dir`: `media` for MediaResources (music, voices),
 * `assets` for asset bundles (pictures, sprites). True if BA-AD ran.
 */
export function baad({ media = false, assets = false, platform, filter, dir }) {
  const result = spawnSync(
    process.env.BAAD || "baad",
    [
      ...["download", "japan"],
      ...(media ? ["--media"] : []),
      ...(assets ? ["--assets"] : []),
      ...(platform ? ["--platform", platform] : []),
      ...["--filter", filter, "--filter-method", "regex", "--output", dir],
    ],
    { encoding: "utf8", maxBuffer: 1 << 28 }
  );
  if (result.error || result.status !== 0) {
    if (!baadWarned) {
      console.warn(
        `BA-AD didn't run (${lastLine(result)}): using the files already here.`
      );
      baadWarned = true;
    }
    return false;
  }
  const got = (result.stdout.match(/Downloaded:/g) ?? []).length;
  if (got > 0) console.log(`BA-AD: ${got} file(s) from the game.`);
  return true;
}

let baaxWarned = false;

/** Unpacks one of the media's zips into `dir`, with BA-AX. True if it did. */
export function baax(zip, dir) {
  const result = spawnSync(
    process.env.BAAX || "baax",
    ["extract", "media", "--input", zip, "--output", dir],
    { encoding: "utf8", maxBuffer: 1 << 26 }
  );
  if (result.error || result.status !== 0) {
    if (!baaxWarned) {
      console.warn(
        `BA-AX didn't run (${lastLine(result)}): the voice zips stay shut.`
      );
      baaxWarned = true;
    }
    return false;
  }
  return true;
}
