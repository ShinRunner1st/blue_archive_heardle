/**
 * Copies the student table for the student game from SchaleDB, and draws the
 * icon sheet. Run `npm run students` after each Global update: it runs this,
 * then `npm run songs` to put the new sheet on the Worker and R2.
 *
 * - src/constants/students.ts: every student and costume out on JP or
 *   Global, marked with which, cut down to the fields the game compares (see
 *   src/helpers/studentData.ts, which stops the script if SchaleDB's format
 *   has changed).
 * - src/constants/studentDailyOrder.ts: the daily schedule for each way to
 *   play on each server. Like the OST's, it is only ever appended to, so a
 *   new student can't change a day already played.
 * - pictures/students/icons.webp: every icon in one sheet, in the table's
 *   order (see src/constants/studentIcons.ts): each student's picture from
 *   the game's files, cut square (scripts/lib/studentPictures.mjs), or
 *   SchaleDB's for the few older costumes the game's files don't name.
 * - pictures/students/clues.webp: the school, role and gift icons for the
 *   table's cells, with src/constants/clueIcons.ts saying which is where.
 *   A school SchaleDB has no icon for (Sakugawa) gets ETC's, which is
 *   Schale's emblem. Attack and armour types are the sword and the shield on
 *   a circle of the type's colour (scripts/lib/typeColors.mjs).
 * - pictures/portraits/<id>.webp: each student's portrait, for the photo on
 *   the Sensei card, from the game's files like the icons. A file each, since
 *   a card shows one; the game never asks for one during a round, so they
 *   give nothing away.
 *
 * A sheet or portrait is drawn again only when the pictures it's drawn from
 * change (pictures/sources.json), so a run elsewhere, on another ffmpeg,
 * doesn't give players new copies of the same pictures.
 *
 * SchaleDB's FAQ allows reusing its data and images. Only the official
 * English text is used, never community translations.
 */
import { execFile } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

import { obscure, reveal } from "../src/helpers/obscure.ts";
import {
  clueIconFiles,
  convertStudents,
  FALLBACK_SCHOOL_ICON,
} from "../src/helpers/studentData.ts";
import {
  CLUE_CELL,
  CLUE_COLUMNS,
  CLUE_SHEET_KEY,
  CLUE_SIZE,
  ICON_CELL,
  ICON_COLUMNS,
  ICON_SHEET_KEY,
  ICON_SIZE,
} from "../src/constants/studentIcons.ts";
import {
  drawnFrom,
  recordDrawnFrom,
  reportFallbacks,
  sha1,
} from "./lib/gameFiles.mjs";
import { shuffled } from "./lib/shuffle.mjs";
import {
  PICTURE_SOURCES,
  studentIcons,
  studentPortraits,
} from "./lib/studentPictures.mjs";
import { TYPE_COLORS, UNKNOWN_TYPE_COLOR } from "./lib/typeColors.mjs";

const run = promisify(execFile);

const DATA_URL = "https://schaledb.com/data/en";
const IMAGES_URL = "https://schaledb.com/images";
const HEADERS = { "User-Agent": "baheardle.com build script" };

const TABLE_PATH = "src/constants/students.ts";
const ORDER_PATH = "src/constants/studentDailyOrder.ts";
const SHEET_PATH = `pictures/${ICON_SHEET_KEY}.webp`;
const CLUE_CACHE = ".cache/clue-icons";
const CLUE_SHEET_PATH = `pictures/${CLUE_SHEET_KEY}.webp`;
const CLUE_MANIFEST_PATH = "src/constants/clueIcons.ts";
const PORTRAIT_DIR = "pictures/portraits";
/**
 * About 10 KB a portrait, at 200x226 as SchaleDB had them: the game's are
 * twice that, which the card, drawn small, doesn't need.
 */
const PORTRAIT_SIZE = "200:226";
const PORTRAIT_QUALITY = 75;
/**
 * WebP quality for the sheet: about 450 KB for 262 students, where their
 * separate icons on SchaleDB come to 2 MB.
 */
const SHEET_QUALITY = 70;
/**
 * The transparency is rounded to six steps (0, 51, ... 255). ffmpeg's WebP
 * keeps it exactly, which cost about 270 KB more; six steps look the same
 * at the sizes the icons show, and save half of that.
 */
const ALPHA_STEP = 51;

/** Fixed seeds, like the OST's: only new students are ever shuffled. */
const SEEDS = {
  GAMEPLAY: 20260928,
  LORE: 20260929,
  GAMEPLAY_JP: 20261010,
  LORE_JP: 20261011,
};

/**
 * Saves a picture from SchaleDB, unless it's in the cache already: true if
 * it's there. SchaleDB answers a missing picture with its page, so anything
 * that isn't a picture counts as missing.
 */
async function downloadOnce(path, file) {
  if (existsSync(file)) return true;
  const response = await fetch(`${IMAGES_URL}/${path}`, { headers: HEADERS });
  const type = response.headers.get("content-type") ?? "";
  await new Promise((resolve) => setTimeout(resolve, 200));
  if (!response.ok || !type.startsWith("image/")) return false;
  writeFileSync(file, Buffer.from(await response.arrayBuffer()));
  return true;
}

/** Thrown to skip drawing a sheet whose contents haven't changed. */
class Unchanged extends Error {}

async function fetchJson(name) {
  const response = await fetch(`${DATA_URL}/${name}.json`, {
    headers: HEADERS,
  });
  if (!response.ok) throw new Error(`${name}.json: ${response.status}`);
  return response.json();
}

const [raw, localization, items] = await Promise.all(
  ["students", "localization", "items"].map(fetchJson)
);
const students = convertStudents(raw, localization, items);
const lore = students.filter((student) => student.lore);
const onGlobal = students.filter((student) => student.global);
const onJp = students.filter((student) => student.jp);

// A table this short means something went wrong, not that students left.
if (onGlobal.length < 200 || lore.length < 100) {
  console.error(
    `Only ${students.length} students (${lore.length} in Lore): stopping.`
  );
  process.exit(1);
}

// What the clue sheet was drawn from last time: a sheet whose icons haven't
// changed isn't drawn again, so its bytes, its name on the Worker and
// players' copies of it stay as they are (the weekly Action runs this on
// another ffmpeg, which would encode the same picture a little differently).
const cluesBefore = existsSync(CLUE_MANIFEST_PATH)
  ? (await import(`../${CLUE_MANIFEST_PATH}`)).clueIcons
  : [];

writeFileSync(
  TABLE_PATH,
  `import { Student } from "../types/student";

/**
 * Every student and costume out on JP or Global, in release order, copied
 * from SchaleDB, each marked with the servers it is out on. The icon sheet
 * (see studentIcons.ts) holds their icons in the same order.
 *
 * GENERATED FILE - do not edit by hand. Run \`npm run students\`.
 */
export const students: Student[] = ${JSON.stringify(students)};
`
);

/** The schedule for one way to play, from the file, or none on first run. */
function loadOrder(source, name) {
  const stored = source?.match(new RegExp(`const ${name} =\\s*"([^"]*)"`));
  if (!stored) return [];
  const text = reveal(stored[1]);
  if (text === null) throw new Error(`Could not read ${name} in ${ORDER_PATH}`);
  return text.split(",").map(Number);
}

const orderSource = existsSync(ORDER_PATH)
  ? readFileSync(ORDER_PATH, "utf8")
  : null;
const orders = {};
for (const [name, pool] of [
  ["GAMEPLAY", onGlobal],
  ["LORE", onGlobal.filter((student) => student.lore)],
  ["GAMEPLAY_JP", onJp],
  ["LORE_JP", onJp.filter((student) => student.lore)],
]) {
  const existing = loadOrder(orderSource, name);
  const scheduled = new Set(existing);
  const added = pool.map(({ id }) => id).filter((id) => !scheduled.has(id));
  orders[name] = [
    ...existing,
    ...shuffled(added, SEEDS[name] + existing.length),
  ];
  console.log(`${name}: ${existing.length} scheduled, ${added.length} added.`);
}

writeFileSync(
  ORDER_PATH,
  `import { reveal } from "../helpers/obscure";

/**
 * The order daily student puzzles are dealt in, by student id, for each way
 * to play on each server.
 *
 * GENERATED FILE - do not edit by hand. Run \`npm run students\`.
 *
 * Entries are never reordered, only appended, so a new student can't change a
 * day already played. Stored scrambled, so the days ahead can't be read off
 * the code.
 */
const GAMEPLAY = "${obscure(orders.GAMEPLAY.join(","))}";
const LORE = "${obscure(orders.LORE.join(","))}";
const GAMEPLAY_JP = "${obscure(orders.GAMEPLAY_JP.join(","))}";
const LORE_JP = "${obscure(orders.LORE_JP.join(","))}";

const ids = (text: string) => (reveal(text) ?? "").split(",").map(Number);

export const gameplayOrder: number[] = ids(GAMEPLAY);
export const loreOrder: number[] = ids(LORE);
export const gameplayOrderJp: number[] = ids(GAMEPLAY_JP);
export const loreOrderJp: number[] = ids(LORE_JP);
`
);

// Icons: each student's picture from the game's files, cut square.
const entryOf = (id) => raw[String(id)];
const icons = await studentIcons(students, entryOf);
const iconSources = sha1(
  ...students.map(({ id }) => `${id}:${icons.get(id).hash};`)
);

// The sheet: each icon scaled into its cell, keeping its transparency, and
// tiled. The icons' see-through pixels are black underneath, and scaling
// the colours as they are mixes that black into the edges as specks. So the
// colours are scaled already weighted by the transparency (the icon on
// black) and the transparency on its own, then divided back apart.
const rows = Math.ceil(students.length / ICON_COLUMNS);
const margin = (ICON_CELL - ICON_SIZE) / 2;
const sameIcons = existsSync(SHEET_PATH) && drawnFrom("icons") === iconSources;
const work = mkdtempSync(join(tmpdir(), "student-icons-"));
try {
  if (sameIcons) throw new Unchanged();
  students.forEach(({ id }, index) => {
    copyFileSync(
      icons.get(id).file,
      join(work, `${String(index).padStart(4, "0")}.png`)
    );
  });
  mkdirSync(join("pictures", ICON_SHEET_KEY, ".."), { recursive: true });
  const scale = `scale=${ICON_SIZE}:${ICON_SIZE}:flags=lanczos`;
  const unweight = (channel) =>
    `${channel}='min(255,${channel}(X,Y)*255/max(alpha(X,Y),1))'`;
  const filters = [
    "format=rgba,split=3[icon][under][shape];",
    // drawbox keeps the icon's transparency unless told to replace it.
    "[under]drawbox=c=black:t=fill:replace=1[black];",
    `[black][icon]overlay=format=auto,format=rgb24,${scale}[colour];`,
    `[shape]alphaextract,${scale},lut=y='round(val/${ALPHA_STEP})*${ALPHA_STEP}'[alpha];`,
    "[colour][alpha]alphamerge,",
    `geq=${["r", "g", "b"].map(unweight).join(":")}:a='alpha(X,Y)',`,
    `pad=${ICON_CELL}:${ICON_CELL}:${margin}:${margin}:color=black@0,`,
    `tile=${ICON_COLUMNS}x${rows}:color=black@0`,
  ].join("");
  await run("ffmpeg", [
    ...["-v", "error", "-y", "-i", join(work, "%04d.png")],
    ...["-filter_complex", filters, "-frames:v", "1"],
    ...["-c:v", "libwebp", "-quality", String(SHEET_QUALITY)],
    ...["-compression_level", "6"],
    ...["-map_metadata", "-1", SHEET_PATH],
  ]);
} catch (error) {
  if (!(error instanceof Unchanged)) throw error;
  console.log(`${SHEET_PATH}: the same pictures, not drawn again.`);
} finally {
  rmSync(work, { recursive: true, force: true });
}
recordDrawnFrom("icons", iconSources);

const kb = (statSync(SHEET_PATH).size / 1024).toFixed(1);
console.log(
  `${students.length} students (${lore.length} in Lore), ${onGlobal.length} on Global, ${onJp.length} on JP.`
);
console.log(`${SHEET_PATH}: ${ICON_COLUMNS}x${rows} icons, ${kb} KB.`);

// The clue icons: each fitted into its cell, keeping its transparency.
mkdirSync(CLUE_CACHE, { recursive: true });
const cached = (path) => join(CLUE_CACHE, path.split("/").pop());
const clues = [];
for (const { key, path, type } of clueIconFiles(
  raw,
  localization,
  items,
  students
)) {
  if (await downloadOnce(path, cached(path))) {
    clues.push({ key, file: cached(path), type });
  } else if (
    key.startsWith("school/") &&
    (await downloadOnce(FALLBACK_SCHOOL_ICON, cached(FALLBACK_SCHOOL_ICON)))
  ) {
    console.log(`No icon for ${key}: it gets ETC's, Schale's emblem.`);
    clues.push({ key, file: cached(FALLBACK_SCHOOL_ICON) });
  } else {
    console.log(`No icon for ${key}: it shows its name.`);
  }
}

/**
 * A type's circle, in its colour with a white ring, so it stands out on a
 * cell of the same colour, and the sword or shield on it.
 */
function typeFilter(type) {
  const color = TYPE_COLORS[type];
  if (!color) {
    console.log(`No colour for the type ${type}: add it to typeColors.mjs.`);
  }
  const hex = (color ?? UNKNOWN_TYPE_COLOR).slice(1);
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const middle = (CLUE_SIZE - 1) / 2;
  const distance = `hypot(X-${middle},Y-${middle})`;
  const ring = CLUE_SIZE / 2 - 4;
  const inRing = `gt(${distance},${ring})`;
  const circle =
    `geq=r='if(${inRing},255,${r})':g='if(${inRing},255,${g})'` +
    `:b='if(${inRing},255,${b})':a='if(lte(${distance},${
      CLUE_SIZE / 2
    }),255,0)'`;
  const icon = Math.round(CLUE_SIZE * 0.58);
  const offset = (CLUE_CELL - icon) / 2;
  return [
    `color=c=black:s=${CLUE_SIZE}x${CLUE_SIZE},format=rgba,${circle},` +
      `pad=${CLUE_CELL}:${CLUE_CELL}:(ow-iw)/2:(oh-ih)/2:color=black@0[circle];`,
    `[0]format=rgba,scale=${icon}:${icon}:flags=lanczos[icon];`,
    `[circle][icon]overlay=${offset}:${offset}`,
  ].join("");
}

const clueRows = Math.ceil(clues.length / CLUE_COLUMNS);
const clueKeys = JSON.stringify(clues.map(({ key }) => key));
const sameClues =
  existsSync(CLUE_SHEET_PATH) && JSON.stringify(cluesBefore) === clueKeys;
const clueWork = mkdtempSync(join(tmpdir(), "clue-icons-"));
try {
  if (sameClues) throw new Unchanged();
  // One at a time first: the icons come as PNG and WebP, in all sizes.
  for (const [index, { file, type }] of clues.entries()) {
    const output = join(clueWork, `${String(index).padStart(4, "0")}.png`);
    await run("ffmpeg", [
      ...["-v", "error", "-y", "-i", file],
      ...(type
        ? ["-filter_complex", typeFilter(type), "-frames:v", "1"]
        : [
            "-vf",
            `format=rgba,scale=${CLUE_SIZE}:${CLUE_SIZE}` +
              ":force_original_aspect_ratio=decrease:flags=lanczos" +
              `,pad=${CLUE_CELL}:${CLUE_CELL}:(ow-iw)/2:(oh-ih)/2:color=black@0`,
          ]),
      output,
    ]);
  }
  await run("ffmpeg", [
    ...["-v", "error", "-y", "-i", join(clueWork, "%04d.png")],
    ...["-vf", `format=rgba,tile=${CLUE_COLUMNS}x${clueRows}:color=black@0`],
    ...["-frames:v", "1", "-c:v", "libwebp", "-quality", "80"],
    ...["-compression_level", "6", "-map_metadata", "-1", CLUE_SHEET_PATH],
  ]);
} catch (error) {
  if (!(error instanceof Unchanged)) throw error;
  console.log(`${CLUE_SHEET_PATH}: the same icons, not drawn again.`);
} finally {
  rmSync(clueWork, { recursive: true, force: true });
}

writeFileSync(
  CLUE_MANIFEST_PATH,
  `/**
 * The icons in the clue sheet (see studentIcons.ts), a cell each in this
 * order, by what the table shows: "school/Abydos", "role/Tank", "gift/...".
 *
 * GENERATED FILE - do not edit by hand. Run \`npm run students\`.
 */
export const clueIcons: string[] = ${clueKeys};
`
);

const clueKb = (statSync(CLUE_SHEET_PATH).size / 1024).toFixed(1);
console.log(`${CLUE_SHEET_PATH}: ${clues.length} icons, ${clueKb} KB.`);

// Portraits: the game's, made into small WebPs, and made again only when
// the game's picture changes, so a run elsewhere leaves them as they are.
// One no longer in the table is removed, so an old one can't linger on the
// Worker.
mkdirSync(PORTRAIT_DIR, { recursive: true });
const portraits = await studentPortraits(students, entryOf);
let newPortraits = 0;
for (const { id } of students) {
  const output = join(PORTRAIT_DIR, `${id}.webp`);
  const { file, hash } = portraits.get(id);
  if (existsSync(output) && drawnFrom(`portrait/${id}`) === hash) continue;
  newPortraits += 1;
  await run("ffmpeg", [
    ...["-v", "error", "-y", "-i", file],
    ...["-vf", `scale=${PORTRAIT_SIZE}:flags=lanczos`],
    ...["-c:v", "libwebp", "-quality", String(PORTRAIT_QUALITY)],
    ...["-compression_level", "6", "-map_metadata", "-1", output],
  ]);
  recordDrawnFrom(`portrait/${id}`, hash);
}
const ids = new Set(students.map(({ id }) => `${id}.webp`));
for (const file of readdirSync(PORTRAIT_DIR)) {
  if (!ids.has(file)) rmSync(join(PORTRAIT_DIR, file));
}
const portraitKb = readdirSync(PORTRAIT_DIR).reduce(
  (total, file) => total + statSync(join(PORTRAIT_DIR, file)).size / 1024,
  0
);
console.log(
  `${PORTRAIT_DIR}: ${
    students.length
  } portraits (${newPortraits} new), ${portraitKb.toFixed(0)} KB.`
);

reportFallbacks(PICTURE_SOURCES);
