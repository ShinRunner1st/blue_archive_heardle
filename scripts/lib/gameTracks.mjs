/**
 * The soundtrack as the game itself has it, downloaded with BA-AD
 * (https://github.com/Deathemonic/BA-AD) from JP's servers: the files come
 * out on the day of an update, before the wiki has them, and include the
 * tracks the wiki's Music page never lists (269 and 271 as `_Title`, 314 as
 * `_Short`). The wiki still gives the names; the game's files have none in
 * English.
 *
 * BA-AD puts the music in `<dir>/MediaResources/<GameData|Prologue>/Audio/BGM/`
 * as `Theme_<n>.ogg`, and some themes only as a variant, `Theme_<n>_Title.ogg`
 * or `_Short`, `_Short_Inst` and so on. On 2026-09-29 all 345 songs in the
 * list were byte for byte the same as the game's.
 */
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { baad, MEDIA_DIR } from "./baad.mjs";

/** Where BA-AD's download of the media is (BAAD_OUTPUT overrides). */
export const GAME_DIR = MEDIA_DIR;

/**
 * Themes 1 to 9999 and their variants: the 10000-range specials are left out,
 * as from the wiki.
 */
const THEME_FILE = /^Theme_0*(\d{1,4})(?:_([A-Za-z0-9_]+))?\.ogg$/;

/** The variant taken when a theme has no plain file, first match first. */
const VARIANT_ORDER = ["Title", "Short", "Short_Inst"];

const variantRank = (variant) => {
  if (variant === null) return -1;
  const at = VARIANT_ORDER.indexOf(variant);
  return at === -1 ? VARIANT_ORDER.length : at;
};

/**
 * Downloads the game's music into `dir` with BA-AD; only new files come
 * down. False if BA-AD couldn't run, and the download already here is used.
 */
export function downloadGameTracks(dir = GAME_DIR) {
  return baad({
    media: true,
    // Raw, so the backslashes stay: in a plain string "\d" is a "d", and
    // the weekly Action's first run downloaded no music at all.
    filter: String.raw`^Theme_\d{1,4}(_[A-Za-z0-9_]+)?\.ogg$`,
    dir,
  });
}

/**
 * Each theme number the game has, as the song list writes it ("1", not "01"),
 * with its file: the plain one if there is one, else a variant (Title, then
 * Short, then Short_Inst, then the first by name), named in `variant`. Empty
 * when there's no download, so the wiki alone is used.
 */
export function gameTracks(dir = GAME_DIR) {
  const found = new Map();
  const root = join(dir, "MediaResources");
  if (!existsSync(root)) return found;

  for (const part of readdirSync(root)) {
    const bgm = join(root, part, "Audio", "BGM");
    if (!existsSync(bgm)) continue;
    for (const file of readdirSync(bgm)) {
      const match = THEME_FILE.exec(file);
      if (!match) continue;
      const themeNo = String(Number(match[1]));
      const variant = match[2] ?? null;
      const was = found.get(themeNo);
      const better =
        !was ||
        variantRank(variant) < variantRank(was.variant) ||
        (variantRank(variant) === variantRank(was.variant) && file < was.file);
      if (better) found.set(themeNo, { path: join(bgm, file), file, variant });
    }
  }
  return found;
}
