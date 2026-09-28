/**
 * Copies the student table for the student game from SchaleDB, and draws the
 * icon sheet. Run `npm run students` after each Global update: it runs this,
 * then `npm run songs` to put the new sheet on the Worker and R2.
 *
 * - src/constants/students.ts: every student and costume out on Global, cut
 *   down to the fields the game compares (see src/helpers/studentData.ts,
 *   which stops the script if SchaleDB's format has changed).
 * - src/constants/studentDailyOrder.ts: the daily schedule for each way to
 *   play. Like the OST's, it is only ever appended to, so a new student can't
 *   change a day already played.
 * - pictures/students/icons.webp: every icon in one sheet, in the table's
 *   order (see src/constants/studentIcons.ts). The icons themselves are kept
 *   in .cache/, which isn't committed, and only new ones are downloaded, one
 *   at a time.
 * - pictures/students/clues.webp: the school, role and gift icons for the
 *   table's cells, with src/constants/clueIcons.ts saying which is where.
 *   A school SchaleDB has no icon for (Sakugawa) gets ETC's, which is
 *   Schale's emblem. Attack and armour types are the sword and the shield on
 *   a circle of the type's colour (scripts/lib/typeColors.mjs).
 * - pictures/portraits/<id>.webp: each student's portrait, for the photo on
 *   the Sensei card. A file each, since a card shows one; the game never
 *   asks for one during a round, so they give nothing away.
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
import { shuffled } from "./lib/shuffle.mjs";
import { TYPE_COLORS, UNKNOWN_TYPE_COLOR } from "./lib/typeColors.mjs";

const run = promisify(execFile);

const DATA_URL = "https://schaledb.com/data/en";
const IMAGES_URL = "https://schaledb.com/images";
const HEADERS = { "User-Agent": "baheardle.com build script" };

const TABLE_PATH = "src/constants/students.ts";
const ORDER_PATH = "src/constants/studentDailyOrder.ts";
const ICON_CACHE = ".cache/student-icons";
const SHEET_PATH = `pictures/${ICON_SHEET_KEY}.webp`;
const CLUE_CACHE = ".cache/clue-icons";
const CLUE_SHEET_PATH = `pictures/${CLUE_SHEET_KEY}.webp`;
const CLUE_MANIFEST_PATH = "src/constants/clueIcons.ts";
const PORTRAIT_CACHE = ".cache/student-portraits";
const PORTRAIT_DIR = "pictures/portraits";
/** About 10 KB a portrait, 200x226 as SchaleDB has them. */
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
const SEEDS = { gameplay: 20260928, lore: 20260929 };

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

// A table this short means something went wrong, not that students left.
if (students.length < 200 || lore.length < 100) {
  console.error(
    `Only ${students.length} students (${lore.length} in Lore): stopping.`
  );
  process.exit(1);
}

writeFileSync(
  TABLE_PATH,
  `import { Student } from "../types/student";

/**
 * Every student and costume out on Global, in release order, copied from
 * SchaleDB. The icon sheet (see studentIcons.ts) holds their icons in the
 * same order.
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
for (const [game, pool] of [
  ["gameplay", students],
  ["lore", lore],
]) {
  const existing = loadOrder(orderSource, game.toUpperCase());
  const scheduled = new Set(existing);
  const added = pool.map(({ id }) => id).filter((id) => !scheduled.has(id));
  orders[game] = [
    ...existing,
    ...shuffled(added, SEEDS[game] + existing.length),
  ];
  console.log(`${game}: ${existing.length} scheduled, ${added.length} added.`);
}

writeFileSync(
  ORDER_PATH,
  `import { reveal } from "../helpers/obscure";

/**
 * The order daily student puzzles are dealt in, by student id, for each way
 * to play.
 *
 * GENERATED FILE - do not edit by hand. Run \`npm run students\`.
 *
 * Entries are never reordered, only appended, so a new student can't change a
 * day already played. Stored scrambled, so the days ahead can't be read off
 * the code.
 */
const GAMEPLAY = "${obscure(orders.gameplay.join(","))}";
const LORE = "${obscure(orders.lore.join(","))}";

const ids = (text: string) => (reveal(text) ?? "").split(",").map(Number);

export const gameplayOrder: number[] = ids(GAMEPLAY);
export const loreOrder: number[] = ids(LORE);
`
);

// Icons: only the ones not downloaded before, one at a time.
mkdirSync(ICON_CACHE, { recursive: true });
const iconPath = (id) => join(ICON_CACHE, `${id}.webp`);
const missing = students.filter(({ id }) => !existsSync(iconPath(id)));
for (const { id, name } of missing) {
  if (!(await downloadOnce(`student/icon/${id}.webp`, iconPath(id)))) {
    throw new Error(`No icon for ${name}`);
  }
}
console.log(`${missing.length} new icon(s) downloaded.`);

// The sheet: each icon scaled into its cell, keeping its transparency, and
// tiled. The icons' see-through pixels are black underneath, and scaling
// the colours as they are mixes that black into the edges as specks. So the
// colours are scaled already weighted by the transparency (the icon on
// black) and the transparency on its own, then divided back apart.
const rows = Math.ceil(students.length / ICON_COLUMNS);
const margin = (ICON_CELL - ICON_SIZE) / 2;
const work = mkdtempSync(join(tmpdir(), "student-icons-"));
try {
  students.forEach(({ id }, index) => {
    copyFileSync(
      iconPath(id),
      join(work, `${String(index).padStart(4, "0")}.webp`)
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
    ...["-v", "error", "-y", "-i", join(work, "%04d.webp")],
    ...["-filter_complex", filters, "-frames:v", "1"],
    ...["-c:v", "libwebp", "-quality", String(SHEET_QUALITY)],
    ...["-compression_level", "6"],
    ...["-map_metadata", "-1", SHEET_PATH],
  ]);
} finally {
  rmSync(work, { recursive: true, force: true });
}

const kb = (statSync(SHEET_PATH).size / 1024).toFixed(1);
console.log(`${students.length} students (${lore.length} in Lore).`);
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
    `:b='if(${inRing},255,${b})':a='if(lte(${distance},${CLUE_SIZE / 2}),255,0)'`;
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
const clueWork = mkdtempSync(join(tmpdir(), "clue-icons-"));
try {
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
export const clueIcons: string[] = ${JSON.stringify(clues.map(({ key }) => key))};
`
);

const clueKb = (statSync(CLUE_SHEET_PATH).size / 1024).toFixed(1);
console.log(`${CLUE_SHEET_PATH}: ${clues.length} icons, ${clueKb} KB.`);

// Portraits: downloaded once each, then made into small WebPs. One no longer
// in the table is removed, so an old one can't linger on the Worker.
mkdirSync(PORTRAIT_CACHE, { recursive: true });
mkdirSync(PORTRAIT_DIR, { recursive: true });
let newPortraits = 0;
for (const { id, name } of students) {
  const source = join(PORTRAIT_CACHE, `${id}.webp`);
  const output = join(PORTRAIT_DIR, `${id}.webp`);
  const had = existsSync(source);
  if (!(await downloadOnce(`student/collection/${id}.webp`, source))) {
    throw new Error(`No portrait for ${name}`);
  }
  if (!had) newPortraits += 1;
  if (existsSync(output) && had) continue;
  await run("ffmpeg", [
    ...["-v", "error", "-y", "-i", source],
    ...["-c:v", "libwebp", "-quality", String(PORTRAIT_QUALITY)],
    ...["-compression_level", "6", "-map_metadata", "-1", output],
  ]);
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
  `${PORTRAIT_DIR}: ${students.length} portraits (${newPortraits} new), ${portraitKb.toFixed(0)} KB.`
);
