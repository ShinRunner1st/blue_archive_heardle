/**
 * Draws the halo and weapon sheets for the picture game (halo and weapon
 * guess). Run `npm run build:guess` after `npm run students` (which runs it
 * too); `npm run songs` then puts the sheets on the Worker and R2.
 *
 * - pictures/guess/halos.webp and weapons.webp: every halo and weapon as it
 *   is, trimmed to its edges and fitted to a cell (src/constants/guessSheets.ts).
 * - pictures/guess/halo-shapes.webp and weapon-shapes.webp: the same shapes
 *   in white, for the silhouette way to play, in an order of their own.
 * - src/constants/guessPictures.ts: which students each picture belongs to,
 *   its cell in each sheet, and a weapon's name, stored scrambled.
 * - src/constants/guessDailyOrder.ts: each kind's daily schedule on each
 *   server, only ever appended to.
 *
 * One picture can belong to several students: a student's costumes share a
 * halo, most share a weapon, and the twins Hikari and Nozomi share a halo.
 * Each picture is one answer, and naming any of its students is right.
 *
 * Weapons come from the game's files (scripts/lib/gameFiles.mjs), or
 * SchaleDB's for one they don't have. Halos come from the Blue Archive Wiki
 * on Fandom, as "<Name> Halo.png", where its editors draw them flat, facing
 * us; a halo the wiki doesn't have yet (a new student's) is drawn from the
 * student's sprite in the game's files, or from their 3D model when the
 * sprite has none, and the wiki's replaces it once it's there. Downloads are kept in .cache/,
 * which isn't committed. A sheet is drawn again only when its cells or its
 * pictures change.
 */
import { execFile } from "node:child_process";
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { promisify } from "node:util";

import { obscure, reveal } from "../src/helpers/obscure.ts";
import {
  PICTURE_KINDS,
  PICTURE_SHEETS,
  SHAPE_SHEETS,
} from "../src/constants/guessSheets.ts";
import {
  drawnFrom,
  gameHalos,
  gameNames,
  noteFallback,
  recordDrawnFrom,
  reportFallbacks,
  sha1,
} from "./lib/gameFiles.mjs";
import { shuffled } from "./lib/shuffle.mjs";
import { haloKey, wikiName } from "./lib/halos.mjs";
import { readPixels } from "./lib/rawImage.mjs";
import { loadGamePictures, PICTURE_SOURCES } from "./lib/studentPictures.mjs";
import { loadStudentTable } from "./lib/studentTable.mjs";

const run = promisify(execFile);

const SCHALEDB_DATA = "https://schaledb.com/data/en/students.json";
const WEAPON_URL = "https://schaledb.com/images/weapon";
const WIKI_API = "https://blue-archive.fandom.com/api.php";
const HEADERS = { "User-Agent": "baheardle.com build script" };
/** Between downloads, so neither site sees more than a trickle. */
const PAUSE_MS = 300;

const CACHE = { halo: ".cache/halos", weapon: ".cache/weapons" };
const DATA_PATH = "src/constants/guessPictures.ts";
const DAILY_ORDER_PATH = "src/constants/guessDailyOrder.ts";
/**
 * Which picture was in which cell of each sheet last time, by the picture's
 * key: a sheet whose cells are the same isn't drawn again. Committed, and not
 * put on the Worker (only .webp files are).
 */
const CELLS_PATH = "pictures/guess/cells.json";
const cellsBefore = existsSync(CELLS_PATH)
  ? JSON.parse(readFileSync(CELLS_PATH, "utf8"))
  : {};
const cellsAfter = {};
const sheetFile = (layout) => `pictures/${layout.key}.webp`;

/** Fixed seeds, so the same pictures always land in the same cells. */
const SEEDS = {
  halo: { pictures: 20261101, shapes: 20261102, daily: 20261103, jp: 20261104 },
  weapon: {
    pictures: 20261201,
    shapes: 20261202,
    daily: 20261203,
    jp: 20261204,
  },
};

/** WebP quality for the pictures; the shapes are lossless. */
const PICTURE_QUALITY = 70;
/** A pixel this transparent or more counts as empty when trimming. */
const EMPTY_ALPHA = 12;
/**
 * The transparency, rounded to six steps, as the icon sheet's is. WebP
 * keeps it exactly otherwise, and the halos' glows made that 2.9 MB; this
 * is about 600 KB and looks the same. The shapes' is doubled first too, so
 * thin lines and glows fill in, as the Voice silhouettes' is.
 */
const ALPHA_STEP = 51;

const pause = () => new Promise((resolve) => setTimeout(resolve, PAUSE_MS));

/** Saves a picture, unless it's there already: true if it is. */
async function downloadOnce(url, file) {
  if (existsSync(file)) return true;
  const response = await fetch(url, { headers: HEADERS });
  const type = response.headers.get("content-type") ?? "";
  await pause();
  if (!response.ok || !type.startsWith("image/")) return false;
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, Buffer.from(await response.arrayBuffer()));
  return true;
}

/** A student's name without the costume: "Hoshino (Swimsuit)" is "Hoshino". */

const students = await loadStudentTable();
const tablePlace = new Map(students.map(({ id }, index) => [id, index]));

const response = await fetch(SCHALEDB_DATA, { headers: HEADERS });
if (!response.ok) throw new Error(`students.json: ${response.status}`);
const schale = await response.json();

/**
 * Students grouped by a picture they share, the groups in the table's
 * order. The one who stands for a group, first in it, is its default
 * costume where it has one.
 */
function groupBy(keyOf) {
  const groups = new Map();
  for (const student of students) {
    const key = keyOf(student);
    if (!key) continue;
    groups.set(key, [...(groups.get(key) ?? []), student]);
  }
  return [...groups].map(([key, members]) => {
    const lead = members.find(({ lore }) => lore) ?? members[0];
    return {
      key,
      members: [lead, ...members.filter((member) => member !== lead)],
    };
  });
}

// Halos: one per student, costumes and all, and one for twins who share one.
const halos = groupBy(({ name }) => haloKey(name));

// Weapons: SchaleDB's picture for each, which costumes mostly share.
const weaponOf = new Map();
for (const student of students) {
  const entry = schale[String(student.id)];
  if (
    !entry ||
    typeof entry.WeaponImg !== "string" ||
    typeof entry.Weapon?.Name !== "string"
  ) {
    throw new Error(
      `SchaleDB's data has changed: no weapon for ${student.name}`
    );
  }
  weaponOf.set(student.id, { image: entry.WeaponImg, name: entry.Weapon.Name });
}
const weapons = groupBy(({ id }) => weaponOf.get(id).image);

/** Each halo's file on the wiki, asked for fifty at a time. */
async function haloUrls(names) {
  const urls = new Map();
  for (let i = 0; i < names.length; i += 50) {
    const batch = names.slice(i, i + 50);
    const url = new URL(WIKI_API);
    url.search = new URLSearchParams({
      action: "query",
      format: "json",
      prop: "imageinfo",
      iiprop: "url",
      titles: batch.map((name) => `File:${name} Halo.png`).join("|"),
    });
    const answer = await (await fetch(url, { headers: HEADERS })).json();
    await pause();
    const pages = Object.values(answer?.query?.pages ?? {});
    for (const page of pages) {
      const found = page.imageinfo?.[0]?.url;
      const name = page.title?.replace(/^File:/, "").replace(/ Halo\.png$/, "");
      if (found && name) urls.set(name, found);
    }
  }
  return urls;
}

const haloFile = (name) => join(CACHE.halo, `${wikiName(name)}.png`);

const needHalos = halos
  .map(({ key }) => key)
  .filter((name) => !existsSync(haloFile(name)));
if (needHalos.length > 0) {
  console.log(`Downloading ${needHalos.length} halo(s) from the wiki.`);
  const urls = await haloUrls(needHalos.map(wikiName));
  for (const name of needHalos) {
    const url = urls.get(wikiName(name));
    // The wiki sends WebP unless asked for the file as it was uploaded.
    const original =
      url && `${url}${url.includes("?") ? "&" : "?"}format=original`;
    if (!original || !(await downloadOnce(original, haloFile(name)))) {
      console.log(`  No halo on the wiki for ${name}.`);
    }
  }
}

/** Each group's picture, by kind and key: { file, hash } of what it's drawn from. */
const pictureFiles = { halo: new Map(), weapon: new Map() };
const fileHash = (file) => sha1(readFileSync(file));

for (const { key } of halos) {
  if (existsSync(haloFile(key))) {
    pictureFiles.halo.set(key, {
      file: haloFile(key),
      hash: fileHash(haloFile(key)),
    });
  }
}

// A halo the wiki doesn't have yet (a new student's): drawn from the sprite
// of the first of the group's students whose sprite has one, or else from
// their 3D model.
const unhaloed = halos.filter(({ key }) => !pictureFiles.halo.has(key));
const fromGame = [];
if (unhaloed.length > 0) {
  const drawn = await gameHalos(
    unhaloed.map(({ key, members }) => ({
      key,
      names: members.flatMap(({ id }) => gameNames(schale[String(id)])),
    }))
  );
  for (const [key, picture] of drawn) {
    pictureFiles.halo.set(key, picture);
    fromGame.push(key);
  }
}
if (fromGame.length > 0) {
  const line = `- Halos drawn from the game's files, as the wiki has none yet: ${fromGame.join(
    ", "
  )}`;
  console.log(line);
  if (process.env.UPDATE_SUMMARY) {
    appendFileSync(process.env.UPDATE_SUMMARY, `${line}\n`);
  }
}
// Which, so the weekly Action (find-updates.mjs) looks for them on the wiki.
recordDrawnFrom("guess/halos-from-game", fromGame.join(","));

// Weapons: the game's pictures, or SchaleDB's for one it doesn't name.
const game = loadGamePictures();
const weaponFile = (image) => join(CACHE.weapon, `${image}.webp`);
const noWeapon = [];
for (const { key } of weapons) {
  const picture = game.weapon(key);
  if (picture) {
    pictureFiles.weapon.set(key, { file: picture.file, hash: picture.hash });
    continue;
  }
  if (!(await downloadOnce(`${WEAPON_URL}/${key}.webp`, weaponFile(key)))) {
    throw new Error(`No weapon picture for ${key}, in the game or SchaleDB`);
  }
  pictureFiles.weapon.set(key, {
    file: weaponFile(key),
    hash: fileHash(weaponFile(key)),
  });
  noWeapon.push(key);
}
// Many missing means the game renamed them: stop, rather than take them all
// from SchaleDB.
if (noWeapon.length > weapons.length * 0.1) {
  console.error(
    `${noWeapon.length} of ${weapons.length} weapons aren't in the game's files: stopping.`
  );
  process.exit(1);
}
for (const key of noWeapon) noteFallback("weapon", key);

/**
 * The box round everything that isn't transparent: the wiki's halos sit in
 * canvases of any size, some with the halo small in the middle, and the
 * weapons have room round them for the longest rifle.
 */
function edges({ width, height, data }) {
  let left = width;
  let top = height;
  let right = -1;
  let bottom = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (data[(y * width + x) * 4 + 3] <= EMPTY_ALPHA) continue;
      if (x < left) left = x;
      if (x > right) right = x;
      if (y < top) top = y;
      if (y > bottom) bottom = y;
    }
  }
  if (right < 0) return null;
  return { x: left, y: top, width: right - left + 1, height: bottom - top + 1 };
}

/** Where each group's picture is, trimmed, or the groups left without one. */
async function trimAll(kind, groups) {
  const out = [];
  const missing = [];
  for (const group of groups) {
    const file = pictureFiles[kind].get(group.key)?.file;
    if (!file || !existsSync(file)) {
      missing.push(group.key);
      continue;
    }
    const box = edges(await readPixels(file));
    if (!box) {
      missing.push(group.key);
      continue;
    }
    out.push({ ...group, file, box });
  }
  return { pictures: out, missing };
}

/** One sheet: each picture fitted to its cell, in the order given. */
async function drawSheet(pictures, layout, shape) {
  const work = mkdtempSync(join(tmpdir(), "guess-sheet-"));
  const rows = Math.ceil(pictures.length / layout.columns);
  try {
    for (const [index, { file, box }] of pictures.entries()) {
      const filters = [
        "format=rgba",
        `crop=${box.width}:${box.height}:${box.x}:${box.y}`,
        `scale=w=${layout.width}:h=${layout.height}:force_original_aspect_ratio=decrease:flags=lanczos`,
        ...(shape
          ? [
              `geq=r=255:g=255:b=255:a='round(min(255,alpha(X,Y)*2)/${ALPHA_STEP})*${ALPHA_STEP}'`,
            ]
          : []),
        `pad=${layout.cellWidth}:${layout.cellHeight}:(ow-iw)/2:(oh-ih)/2:color=black@0`,
      ];
      await run("ffmpeg", [
        ...["-v", "error", "-y", "-i", file, "-frames:v", "1"],
        ...["-vf", filters.join(",")],
        join(work, `${String(index).padStart(4, "0")}.png`),
      ]);
    }

    const path = `pictures/${layout.key}.webp`;
    mkdirSync(dirname(path), { recursive: true });
    const tile = `format=rgba,tile=${layout.columns}x${rows}:color=black@0`;
    const rounded =
      `${tile},split[colour][shape];` +
      `[shape]alphaextract,lut=y='round(val/${ALPHA_STEP})*${ALPHA_STEP}'[alpha];` +
      "[colour][alpha]alphamerge";
    await run("ffmpeg", [
      ...["-v", "error", "-y", "-i", join(work, "%04d.png")],
      ...["-filter_complex", shape ? tile : rounded],
      ...["-frames:v", "1", "-c:v", "libwebp"],
      ...(shape ? ["-lossless", "1"] : ["-quality", String(PICTURE_QUALITY)]),
      ...["-compression_level", "6", "-map_metadata", "-1", path],
    ]);
    return path;
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

/** A schedule as written last, by lead student id: HALOS, WEAPONS_JP... */
function storedDaily(source, name) {
  const match = source?.match(new RegExp(`${name} =\\s*"([^"]*)"`));
  return match
    ? (reveal(match[1]) ?? "").split(",").filter(Boolean).map(Number)
    : [];
}

const dailySource = existsSync(DAILY_ORDER_PATH)
  ? readFileSync(DAILY_ORDER_PATH, "utf8")
  : null;

const data = {};
const daily = {};
let names = [];
const kb = (path) => statSync(path).size / 1024;

for (const kind of PICTURE_KINDS) {
  const groups = kind === "halo" ? halos : weapons;
  const { pictures, missing } = await trimAll(kind, groups);

  // A list this short means something went wrong, not that pictures left.
  if (pictures.length < groups.length * 0.9) {
    console.error(
      `Only ${pictures.length} of ${groups.length} ${kind}s: stopping.`
    );
    process.exit(1);
  }
  if (missing.length > 0) {
    console.log(`No ${kind} yet for: ${missing.join(", ")}.`);
  }

  // Each sheet in a shuffled order of its own.
  const inPictureSheet = shuffled(pictures, SEEDS[kind].pictures);
  const inShapeSheet = shuffled(pictures, SEEDS[kind].shapes);
  // The same pictures in the same cells as last time: the sheets aren't
  // drawn again, so their bytes and names on the Worker stay as they are.
  const cellsNow = pictures
    .map((picture) =>
      [
        picture.key,
        inPictureSheet.indexOf(picture),
        inShapeSheet.indexOf(picture),
      ].join(":")
    )
    .join(",");
  const sources = sha1(
    ...pictures.map(({ key }) => `${key}:${pictureFiles[kind].get(key).hash};`)
  );
  const same =
    cellsBefore[kind] === cellsNow &&
    drawnFrom(`guess/${kind}`) === sources &&
    existsSync(sheetFile(PICTURE_SHEETS[kind])) &&
    existsSync(sheetFile(SHAPE_SHEETS[kind]));
  const picturePath = same
    ? sheetFile(PICTURE_SHEETS[kind])
    : await drawSheet(inPictureSheet, PICTURE_SHEETS[kind], false);
  const shapePath = same
    ? sheetFile(SHAPE_SHEETS[kind])
    : await drawSheet(inShapeSheet, SHAPE_SHEETS[kind], true);
  cellsAfter[kind] = cellsNow;
  recordDrawnFrom(`guess/${kind}`, sources);
  if (same) console.log(`${kind}: the same pictures, not drawn again.`);
  console.log(
    `${kind}: ${pictures.length} pictures, ${kb(picturePath).toFixed(
      0
    )} KB, shapes ${kb(shapePath).toFixed(0)} KB.`
  );

  // The groups in the table's order, with their cells in each sheet.
  const ordered = [...pictures].sort(
    (a, b) => tablePlace.get(a.members[0].id) - tablePlace.get(b.members[0].id)
  );
  // Each picture as its two cells, then its students' places in the table,
  // two base-36 characters each, as voiceTones.ts keeps them: ids and JSON
  // came to 9 KB gzipped, scrambled.
  const code = (number) => number.toString(36).padStart(2, "0");
  data[kind] = ordered
    .map((picture) =>
      [
        inPictureSheet.indexOf(picture),
        inShapeSheet.indexOf(picture),
        ...picture.members.map(({ id }) => tablePlace.get(id)),
      ]
        .map(code)
        .join("")
    )
    .join(",");
  if (kind === "weapon") {
    names = ordered.map(({ members }) => weaponOf.get(members[0].id).name);
  }

  // Each server's daily schedule: only ever appended to, so a new student
  // can't change a day already played. A server's pictures are those with a
  // student out there, led as the game leads them (see pictureRounds.ts):
  // the first default costume among them, or the first of them.
  for (const [server, name, seed] of [
    ["global", `${kind.toUpperCase()}S`, SEEDS[kind].daily],
    ["jp", `${kind.toUpperCase()}S_JP`, SEEDS[kind].jp],
  ]) {
    const leads = ordered.flatMap(({ members }) => {
      const out = members
        .filter((student) => student[server])
        .sort((a, b) => tablePlace.get(a.id) - tablePlace.get(b.id));
      const lead = out.find(({ lore }) => lore) ?? out[0];
      return lead ? [lead.id] : [];
    });
    const scheduled = storedDaily(dailySource, name);
    const unscheduled = leads.filter((id) => !scheduled.includes(id));
    daily[name] = [
      ...scheduled,
      ...shuffled(unscheduled, seed + scheduled.length),
    ];
    console.log(
      `  daily ${name}: ${scheduled.length} scheduled, ${unscheduled.length} added.`
    );
  }
}

writeFileSync(
  CELLS_PATH,
  `${JSON.stringify(cellsAfter, null, 1)}
`
);

writeFileSync(
  DATA_PATH,
  `import { reveal } from "../helpers/obscure";

/**
 * The picture game's answers for each kind, in the student table's order of
 * the one who stands for each: its cell in the picture sheet and in the
 * shape sheet, then the places in the student table of the students it
 * belongs to, that one first. Two base-36 characters each, a picture to an
 * entry. Stored scrambled, so which cell is whose can't be read off the code
 * at a glance.
 *
 * GENERATED FILE - do not edit by hand. Run \`npm run build:guess\`.
 */
export const HALOS = "${obscure(data.halo)}";

export const WEAPONS = "${obscure(data.weapon)}";

/**
 * Each weapon's name, in WEAPONS' order. Plain: a name says nothing of whose
 * it is.
 */
export const WEAPON_NAMES: string[] = ${JSON.stringify(names)};

/** A kind's table, unscrambled: an entry per picture, or none. */
export function readPictureTable(scrambled: string): string[] {
  return (reveal(scrambled) ?? "").split(",").filter(Boolean);
}
`
);

writeFileSync(
  DAILY_ORDER_PATH,
  `import { reveal } from "../helpers/obscure";

/**
 * The order the daily halo and weapon puzzles are dealt in on each server, by
 * the student who stands for each picture there.
 *
 * GENERATED FILE - do not edit by hand. Run \`npm run build:guess\`.
 *
 * Entries are never reordered, only appended, so a new student can't change a
 * day already played. Stored scrambled, so the days ahead can't be read off
 * the code.
 */
const HALOS = "${obscure(daily.HALOS.join(","))}";

const WEAPONS = "${obscure(daily.WEAPONS.join(","))}";

const HALOS_JP = "${obscure(daily.HALOS_JP.join(","))}";

const WEAPONS_JP = "${obscure(daily.WEAPONS_JP.join(","))}";

const read = (scrambled: string): number[] =>
  (reveal(scrambled) ?? "").split(",").filter(Boolean).map(Number);

export const haloOrder: number[] = read(HALOS);

export const weaponOrder: number[] = read(WEAPONS);

export const haloOrderJp: number[] = read(HALOS_JP);

export const weaponOrderJp: number[] = read(WEAPONS_JP);
`
);

reportFallbacks(PICTURE_SOURCES);
