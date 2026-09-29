/**
 * Each student's icon and portrait, from the game's files
 * (scripts/lib/gameFiles.mjs), for the icon sheet, the Voice silhouettes and
 * the Sensei card. A few older costumes' pictures aren't in the game's files
 * under any name we know (Hasumi, Yuuka, Hoshino (Armed)...); theirs come
 * from SchaleDB, as every one did before, and are noted for the pull request.
 *
 * If the game's pictures aren't there at all (BA-AD or UnityPy missing, the
 * game in maintenance) or many are missing (the game renamed them), every
 * missing one still comes from SchaleDB, so the update isn't held up, but
 * the pull request warns in bold: merging it swaps those pictures for
 * SchaleDB's art, and players download the sheets again.
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

import {
  asIcon,
  gamePictures,
  noteFallback,
  squareIcon,
  warnInSummary,
} from "./gameFiles.mjs";

const IMAGES_URL = "https://schaledb.com/images";
const HEADERS = { "User-Agent": "baheardle.com build script" };
const ICON_CACHE = ".cache/student-icons";
const PORTRAIT_CACHE = ".cache/student-portraits";

/** More than this share of a kind from SchaleDB is warned about. */
const MOST_MISSING = 0.1;

/** Where the pictures came from, for reportFallbacks. */
export const PICTURE_SOURCES = {
  icon: "SchaleDB",
  portrait: "SchaleDB",
  weapon: "SchaleDB",
  halo: "the Fandom wiki",
  "voice line": "SchaleDB",
};

/**
 * Saves a picture from SchaleDB, unless it's in the cache already: true if
 * it's there. SchaleDB answers a missing picture with its page, so anything
 * that isn't a picture counts as missing.
 */
export async function schaleDbPicture(path, file) {
  if (existsSync(file)) return true;
  const response = await fetch(`${IMAGES_URL}/${path}`, { headers: HEADERS });
  const type = response.headers.get("content-type") ?? "";
  await new Promise((resolve) => setTimeout(resolve, 200));
  if (!response.ok || !type.startsWith("image/")) return false;
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, Buffer.from(await response.arrayBuffer()));
  return true;
}

let pictures;
/** Whether the game's pictures were there at all (else that's warned of). */
let gameFound = false;

/**
 * The game's pictures, loaded once a run. Without them (BA-AD or UnityPy
 * missing), none is found, and each comes from SchaleDB.
 */
export function loadGamePictures() {
  if (pictures === undefined) {
    pictures = gamePictures();
    gameFound = Boolean(pictures);
    if (!pictures) {
      warnInSummary(
        "the game's pictures couldn't be had (BA-AD or UnityPy didn't run), " +
          "so every icon, portrait and weapon is SchaleDB's this time."
      );
      pictures = { icon: () => null, portrait: () => null, weapon: () => null };
    }
  }
  return pictures;
}

/**
 * Notes the pictures of a kind that came from SchaleDB for the pull request
 * (unless `note` is false), warning when there are many: the game may have
 * renamed them.
 */
export function checkMissing(what, missing, total, note = true) {
  if (missing.length > total * MOST_MISSING && gameFound) {
    warnInSummary(
      `${missing.length} of ${total} ${what}s aren't in the game's files ` +
        "(were they renamed?), so they're SchaleDB's."
    );
  }
  // Without the game's pictures at all, the warning says it for every one.
  if (note && gameFound) for (const name of missing) noteFallback(what, name);
}

/**
 * Every student's icon, square, as a PNG: a Map of id to { file, hash }.
 * `entryOf` gives a student's SchaleDB entry, for the game's names; `note`
 * false leaves the missing ones out of the pull request's list (when another
 * script has listed them).
 */
export async function studentIcons(students, entryOf, { note = true } = {}) {
  const game = loadGamePictures();
  const icons = new Map();
  const missing = [];
  for (const { id, name } of students) {
    const picture = game.icon(entryOf(id));
    if (picture) {
      icons.set(id, await squareIcon(picture, id));
      continue;
    }
    const cached = `${ICON_CACHE}/${id}.webp`;
    if (!(await schaleDbPicture(`student/icon/${id}.webp`, cached))) {
      throw new Error(`No icon for ${name}, in the game or on SchaleDB`);
    }
    icons.set(id, await asIcon(cached, id));
    missing.push(name);
  }
  checkMissing("icon", missing, students.length, note);
  return icons;
}

/**
 * Every student's portrait, for the Sensei card: a Map of id to { file,
 * hash } of the game's (404x456) or SchaleDB's (200x226) picture.
 */
export async function studentPortraits(students, entryOf) {
  const game = loadGamePictures();
  const portraits = new Map();
  const missing = [];
  for (const { id, name } of students) {
    const picture = game.portrait(entryOf(id));
    if (picture) {
      portraits.set(id, { file: picture.file, hash: picture.hash });
      continue;
    }
    const cached = `${PORTRAIT_CACHE}/${id}.webp`;
    if (!(await schaleDbPicture(`student/collection/${id}.webp`, cached))) {
      throw new Error(`No portrait for ${name}, in the game or on SchaleDB`);
    }
    portraits.set(id, { file: cached, hash: `schaledb:${id}` });
    missing.push(name);
  }
  checkMissing("portrait", missing, students.length);
  return portraits;
}
