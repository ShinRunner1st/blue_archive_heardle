/**
 * The game's own files for the build scripts: student pictures, portraits,
 * weapons, halos and voice lines, downloaded from JP's servers with BA-AD
 * (scripts/lib/baad.mjs), the pictures unpacked by
 * scripts/extract-game-files.py (UnityPy) and the voice zips by BA-AX.
 * SchaleDB still gives the data (the game's tables are encrypted) and each
 * line's text, and names the files: each student's DevName and PathName are
 * the game's names for them.
 *
 * Every function here gives what it found and nothing else: a picture or line
 * the game's files don't have (BA-AD not installed, Python without UnityPy, a
 * name the game spells another way) comes back null, and the build script
 * takes it from SchaleDB or the Fandom wiki, as before, and notes it with
 * `noteFallback`, which the weekly pull request lists.
 *
 * Unpacked files are kept in .cache/game/, and each picture made from them
 * (a square icon, a halo) is made again only when what it's made from
 * changes, by the pixel hashes the unpacking records.
 */
import { execFile, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  appendFileSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { promisify } from "node:util";

import {
  baad,
  baax,
  MEDIA_DIR,
  MODEL_DIR,
  SPRITE_DIR,
  UI_DIR,
} from "./baad.mjs";
import { renderModelHalo } from "./modelHalo.mjs";
import { readPixels, writePng } from "./rawImage.mjs";
import { renderHalo } from "./spineHalo.mjs";

const run = promisify(execFile);

const OUT = ".cache/game";
const UI_OUT = join(OUT, "ui");
const SPRITE_OUT = join(OUT, "sprites");
const MODEL_OUT = join(OUT, "models");
const VOICE_OUT = join(OUT, "voices");
const ICON_OUT = join(OUT, "icons");
const HALO_OUT = join(OUT, "halos");
const EXTRACTOR = "scripts/extract-game-files.py";
const PYTHON =
  process.env.PYTHON || (process.platform === "win32" ? "python" : "python3");

/**
 * Bumped when a picture made here is made differently, so every one is made
 * again rather than kept from before.
 */
const MAKE_VERSION = "2";

/** The groups of the game's UI pictures the student pictures are in. */
const UI_GROUPS = ["01_character", "04_weapon", "14_charactercollect"];

/**
 * Costumes the game's pictures name differently from SchaleDB's DevName and
 * PathName, by PathName. New students follow the names, so this only grows
 * if an old costume is found missing.
 */
const NAME_FIXES = {
  shiroko_cycling: "shiroko_ridingsuit",
  reijo: "reizyo",
};

export const sha1 = (...parts) => {
  const hash = createHash("sha1");
  for (const part of parts) hash.update(part);
  return hash.digest("hex");
};

// --- What came from elsewhere, for the pull request ---

const fallbacks = new Map();

/** Notes that `what` (a kind: "icon", "halo") of `name` didn't come from the game. */
export function noteFallback(what, name) {
  fallbacks.set(what, [...(fallbacks.get(what) ?? []), name]);
}

/** Prints the notes, and adds them to UPDATE_SUMMARY for the pull request. */
export function reportFallbacks(source) {
  if (fallbacks.size === 0) return;
  const lines = [...fallbacks].map(
    ([what, names]) =>
      `- Not in the game's files, so from ${
        source[what] ?? "before"
      }: ${what} of ${names.join(", ")}`
  );
  console.log(lines.join("\n"));
  if (process.env.UPDATE_SUMMARY) {
    appendFileSync(process.env.UPDATE_SUMMARY, `${lines.join("\n")}\n`);
  }
  fallbacks.clear();
}

/**
 * Something the pull request's reader should see before merging: printed,
 * and added to UPDATE_SUMMARY in bold. On GitHub it's also a warning on the
 * run's page, for a week with nothing new and so no pull request.
 */
export function warnInSummary(text) {
  console.warn(
    process.env.GITHUB_ACTIONS ? `::warning::${text}` : `Warning: ${text}`
  );
  if (process.env.UPDATE_SUMMARY) {
    appendFileSync(process.env.UPDATE_SUMMARY, `- **Warning:** ${text}\n`);
  }
}

// --- Unpacking ---

let pythonReady = null;

/** Runs the unpacker; false (said once) if Python or UnityPy isn't there. */
function unpack(args) {
  if (pythonReady === null) {
    const check = spawnSync(PYTHON, ["-c", "import UnityPy"], {
      encoding: "utf8",
    });
    pythonReady = !check.error && check.status === 0;
    if (!pythonReady) {
      console.warn(
        `No ${PYTHON} with UnityPy (pip install -r scripts/requirements.txt): ` +
          "using what's unpacked already."
      );
    }
  }
  if (!pythonReady) return false;
  const result = spawnSync(PYTHON, [EXTRACTOR, ...args], {
    encoding: "utf8",
    maxBuffer: 1 << 26,
  });
  if (result.stdout.trim()) console.log(result.stdout.trim());
  if (result.status !== 0) {
    console.warn(`Unpacking failed: ${result.stderr.trim().slice(-400)}`);
    return false;
  }
  return true;
}

/** What's been unpacked into `dir`, by name in lower case. */
function readIndex(dir) {
  const path = join(dir, "index.json");
  if (!existsSync(path)) return new Map();
  return new Map(Object.entries(JSON.parse(readFileSync(path, "utf8"))));
}

/** The game's names for a student, from SchaleDB's entry, in lower case. */
export function gameNames(entry) {
  const names = [entry?.DevName, entry?.PathName]
    .filter((name) => typeof name === "string" && name.length > 0)
    .map((name) => name.toLowerCase());
  const fixed = names.map((name) => NAME_FIXES[name]).filter(Boolean);
  return [...new Set([...names, ...fixed])];
}

// --- Student pictures and weapons ---

/**
 * The game's student pictures, portraits and weapons, downloaded and
 * unpacked (only new ones), with a function for each to find one: null if
 * none was unpacked at all.
 */
export function gamePictures() {
  baad({
    assets: true,
    filter: `^uis-01_common-(${UI_GROUPS.join("|")})-`,
    dir: UI_DIR,
  });
  unpack(["bundles", UI_DIR, UI_OUT, "Student_Portrait_", "Weapon_Icon_"]);
  const index = readIndex(UI_OUT);
  if (index.size === 0) return null;
  const found = (name) => {
    const hit = index.get(name);
    return hit ? { ...hit, file: join(UI_OUT, hit.file) } : null;
  };
  const student = (entry, suffix) => {
    for (const name of gameNames(entry)) {
      const hit = found(`student_portrait_${name}${suffix}`);
      if (hit) return hit;
    }
    return null;
  };
  return {
    /** The picture the icon is cut from: 252x204, see squareIcon. */
    icon: (entry) => student(entry, ""),
    /** The Sensei card's portrait, with its background: 404x456. */
    portrait: (entry) => student(entry, "_collection"),
    /** A weapon, by SchaleDB's WeaponImg ("weapon_icon_10000"). */
    weapon: (image) => found(String(image).toLowerCase()),
  };
}

/**
 * Every icon's size, whatever it's made from: ffmpeg tiles a sheet from a
 * sequence of pictures, and one of another size partway through starts the
 * sheet over. The game's pictures are 204 pixels high.
 */
const ICON_PIXELS = 204;

/** Makes `file` from `source` with ffmpeg's `filter`, if `hash` has changed. */
async function makeIcon(source, file, filter, hash) {
  mkdirSync(ICON_OUT, { recursive: true });
  const stamp = `${file}.hash`;
  if (
    existsSync(file) &&
    existsSync(stamp) &&
    readFileSync(stamp, "utf8") === hash
  ) {
    return;
  }
  await run("ffmpeg", [
    ...["-v", "error", "-y", "-i", source],
    ...["-vf", `format=rgba,${filter}`, "-frames:v", "1", file],
  ]);
  writeFileSync(stamp, hash);
}

const iconScale = `scale=${ICON_PIXELS}:${ICON_PIXELS}:flags=lanczos`;

/**
 * A student's icon, square, as SchaleDB's are: the middle of the game's
 * picture, its full height. Made once, and again only when the picture
 * changes. { file, hash } of a PNG.
 */
export async function squareIcon(picture, id) {
  const file = join(ICON_OUT, `${id}.png`);
  const hash = sha1(MAKE_VERSION, "square", picture.hash);
  await makeIcon(
    picture.file,
    file,
    `crop=ih:ih:(iw-ih)/2:0,${iconScale}`,
    hash
  );
  return { file, hash };
}

/**
 * Another icon (SchaleDB's, square already) as the game's are made: a PNG
 * of the same size in .cache/game/icons/. { file, hash } by its bytes.
 */
export async function asIcon(source, id) {
  const file = join(ICON_OUT, `${id}.png`);
  const hash = sha1(MAKE_VERSION, "icon", readFileSync(source));
  await makeIcon(source, file, iconScale, hash);
  return { file, hash };
}

// --- Halos ---

/** The page names an atlas's text lists: the lines naming a .png. */
const atlasPages = (text) =>
  text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /\.png$/i.test(line));

/**
 * Each group's halo, drawn from the sprite of the first of its names (the
 * game's names of its students, in order) that has one, or else from the
 * first of their 3D models that has one: a Map of the group's key to
 * { file, hash } of a PNG. A group missing from it has no halo in the
 * game's files.
 */
export async function gameHalos(groups) {
  const halos = await spriteHalos(groups);
  const rest = groups.filter(({ key }) => !halos.has(key));
  for (const [key, halo] of await modelHalos(rest)) halos.set(key, halo);
  return halos;
}

/** A halo made before from the same files, if its stamp says so. */
function madeAlready(file, hash) {
  const stamp = `${file}.hash`;
  return (
    existsSync(file) &&
    existsSync(stamp) &&
    readFileSync(stamp, "utf8") === hash
  );
}

async function saveHalo(file, hash, halo) {
  await writePng(file, halo);
  writeFileSync(`${file}.hash`, hash);
}

/** gameHalos' first try: the students' sprites. */
async function spriteHalos(groups) {
  const all = [...new Set(groups.flatMap(({ names }) => names))].map((name) =>
    name.replace(/[^a-z0-9_]/g, "")
  );
  if (all.length > 0) {
    baad({
      assets: true,
      platform: "windows",
      filter: `^assets-_mx-spinecharacters-(${all.join(
        "|"
      )})_spr-_mxdependency-(textures|textassets)-`,
      dir: SPRITE_DIR,
    });
    unpack(["bundles", SPRITE_DIR, SPRITE_OUT]);
  }
  const index = readIndex(SPRITE_OUT);
  mkdirSync(HALO_OUT, { recursive: true });

  const halos = new Map();
  for (const { key, names } of groups) {
    for (const name of names) {
      const sprite = `${name}_spr`;
      const atlas = index.get(`${sprite}.atlas`);
      const skel = index.get(`${sprite}.skel`);
      if (!atlas || !skel) continue;
      const atlasText = readFileSync(join(SPRITE_OUT, atlas.file), "utf8");
      const pages = atlasPages(atlasText).map((page) => ({
        page,
        texture: index.get(page.replace(/\.png$/i, "").toLowerCase()),
      }));
      if (pages.some(({ texture }) => !texture)) continue;
      const hash = sha1(
        MAKE_VERSION,
        "halo",
        atlas.hash,
        skel.hash,
        ...pages.map(({ texture }) => texture.hash)
      );
      const file = join(HALO_OUT, `${sprite}.png`);
      if (madeAlready(file, hash)) {
        halos.set(key, { file, hash });
        break;
      }
      let halo = null;
      try {
        const textures = new Map();
        for (const { page, texture } of pages) {
          textures.set(page, await readPixels(join(SPRITE_OUT, texture.file)));
        }
        halo = renderHalo(
          atlasText,
          new Uint8Array(readFileSync(join(SPRITE_OUT, skel.file))),
          textures
        );
      } catch (error) {
        console.warn(`Could not draw ${sprite}'s halo: ${error.message}`);
      }
      if (!halo) continue;
      await saveHalo(file, hash, halo);
      halos.set(key, { file, hash });
      break;
    }
  }
  return halos;
}

/**
 * gameHalos' second try, for students whose sprite has no halo (Marina's
 * hasn't): their 3D models, "<name>" or "<name>_original" in the game.
 */
async function modelHalos(groups) {
  const models = (names) => names.flatMap((name) => [name, `${name}_original`]);
  const all = [...new Set(groups.flatMap(({ names }) => models(names)))].map(
    (name) => name.replace(/[^a-z0-9_]/g, "")
  );
  const halos = new Map();
  if (all.length === 0) return halos;
  baad({
    assets: true,
    platform: "windows",
    filter: `^assets-_mx-characters-(${all.join(
      "|"
    )})-_mxdependency-(meshes|materials|textures)-`,
    dir: MODEL_DIR,
  });
  unpack(["models", MODEL_DIR, MODEL_OUT, ...all]);
  mkdirSync(HALO_OUT, { recursive: true });

  for (const { key, names } of groups) {
    for (const model of models(names)) {
      const json = join(MODEL_OUT, `${model}.json`);
      if (!existsSync(json)) continue;
      const text = readFileSync(json, "utf8");
      const { pieces } = JSON.parse(text);
      if (pieces.length === 0) continue;
      const files = [...new Set(pieces.map(({ texture }) => texture))].filter(
        Boolean
      );
      const hash = sha1(
        MAKE_VERSION,
        "model halo",
        text,
        ...files.map((texture) => readFileSync(join(MODEL_OUT, texture)))
      );
      const file = join(HALO_OUT, `${model}_model.png`);
      if (madeAlready(file, hash)) {
        halos.set(key, { file, hash });
        break;
      }
      let halo = null;
      try {
        const textures = new Map();
        for (const texture of files) {
          textures.set(texture, await readPixels(join(MODEL_OUT, texture)));
        }
        halo = renderModelHalo(pieces, textures);
      } catch (error) {
        console.warn(`Could not draw ${model}'s halo: ${error.message}`);
      }
      if (!halo) continue;
      await saveHalo(file, hash, halo);
      halos.set(key, { file, hash });
      break;
    }
  }
  return halos;
}

// --- Voice lines ---

/** A file or folder in `dir` by its name in any case, or null. */
function findCaseless(dir, name) {
  if (!existsSync(dir)) return null;
  const found = readdirSync(dir).find((entry) => entry.toLowerCase() === name);
  return found ? join(dir, found) : null;
}

/** Copies the .ogg files in `from` (and its folders) into `to`, lower case. */
function copyLines(from, to) {
  for (const entry of readdirSync(from, { withFileTypes: true })) {
    const path = join(from, entry.name);
    if (entry.isDirectory()) copyLines(path, to);
    else if (/\.ogg$/i.test(entry.name)) {
      copyFileSync(path, join(to, entry.name.toLowerCase()));
    }
  }
}

/**
 * The game's files for voice lines, by SchaleDB's name for each
 * ("jp_aru/aru_lobby_1.mp3"): downloads the zips and title calls of the
 * students they belong to, unpacks them, and gives a function from such a
 * name to the game's .ogg, or null.
 *
 * A student's lines are in GameData/Audio/VOC_JP/JP_<name>.zip, which only
 * BA-AX opens, and the title call in a folder of its own,
 * Prologue/Audio/VOC_JP/JP_<name>/<name>_Title.ogg. Both come out into
 * .cache/game/voices/jp_<name>/, named as SchaleDB names them.
 */
export function gameVoices(clips) {
  const folders = [
    ...new Set(clips.map((clip) => clip.split("/")[0].toLowerCase())),
  ].filter((folder) => /^jp_[a-z0-9_]+$/.test(folder));
  if (folders.length > 0) {
    const names = folders.flatMap((folder) => [
      `${folder}\\.zip`,
      `${folder.slice(3)}_title\\.ogg`,
    ]);
    baad({
      media: true,
      filter: `(?i)^(${names.join("|")})$`,
      dir: MEDIA_DIR,
    });
    const roots = ["GameData", "Prologue"].map((part) =>
      join(MEDIA_DIR, "MediaResources", part, "Audio", "VOC_JP")
    );
    const work = join(OUT, "voice-zip");
    for (const folder of folders) {
      const out = join(VOICE_OUT, folder);
      mkdirSync(out, { recursive: true });
      for (const root of roots) {
        const zip = findCaseless(root, `${folder}.zip`);
        const stamp = join(out, ".zip.hash");
        if (zip) {
          const hash = sha1(readFileSync(zip));
          const done =
            existsSync(stamp) && readFileSync(stamp, "utf8") === hash;
          if (!done) {
            rmSync(work, { recursive: true, force: true });
            if (baax(zip, work)) {
              copyLines(work, out);
              writeFileSync(stamp, hash);
            }
          }
        }
        const titles = findCaseless(root, folder);
        if (titles && statSync(titles).isDirectory()) copyLines(titles, out);
      }
    }
    rmSync(work, { recursive: true, force: true });
  }
  return (clip) => {
    const [folder, file] = clip.toLowerCase().split("/");
    if (!folder || !file) return null;
    const path = join(VOICE_OUT, folder, file.replace(/\.mp3$/, ".ogg"));
    return existsSync(path) ? path : null;
  };
}

// --- What each sheet was drawn from ---

const SOURCES_PATH = "pictures/sources.json";

/**
 * What a sheet (or portrait) was drawn from last time, as a hash: one drawn
 * from the same pictures isn't drawn again, so its bytes and its name on the
 * Worker stay as they are.
 */
export function drawnFrom(key) {
  if (!existsSync(SOURCES_PATH)) return null;
  return JSON.parse(readFileSync(SOURCES_PATH, "utf8"))[key] ?? null;
}

/** Records what a sheet was drawn from (see drawnFrom). */
export function recordDrawnFrom(key, hash) {
  const all = existsSync(SOURCES_PATH)
    ? JSON.parse(readFileSync(SOURCES_PATH, "utf8"))
    : {};
  all[key] = hash;
  const sorted = Object.fromEntries(
    Object.entries(all).sort(([a], [b]) => a.localeCompare(b))
  );
  writeFileSync(SOURCES_PATH, `${JSON.stringify(sorted, null, 1)}\n`);
}
