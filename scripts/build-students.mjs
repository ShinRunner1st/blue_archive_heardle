/**
 * Copies the student table for the student game from SchaleDB, and draws the
 * icon sheet. Run `npm run students` after each Global update: it runs this,
 * then `npm run songs` to put the new sheet on the Worker and R2.
 *
 * - src/constants/students.ts: every student and costume out on Global, cut
 *   down to the fields the game compares (see src/helpers/studentData.ts,
 *   which stops the script if SchaleDB's format has changed).
 * - src/constants/studentBirthdays.ts: each student's birthday, for the
 *   birthday note, small enough for the OST game to carry without the table.
 * - src/constants/studentDailyOrder.ts: the daily schedule for each way to
 *   play. Like the OST's, it is only ever appended to, so a new student can't
 *   change a day already played.
 * - pictures/students/icons.webp: every icon in one sheet, in the table's
 *   order (see src/constants/studentIcons.ts). The icons themselves are kept
 *   in .cache/, which isn't committed, and only new ones are downloaded, one
 *   at a time.
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
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

import { obscure, reveal } from "../src/helpers/obscure.ts";
import { convertStudents } from "../src/helpers/studentData.ts";
import {
  ICON_BACKGROUND,
  ICON_CELL,
  ICON_COLUMNS,
  ICON_SHEET_KEY,
  ICON_SIZE,
} from "../src/constants/studentIcons.ts";
import { shuffled } from "./lib/shuffle.mjs";

const run = promisify(execFile);

const DATA_URL = "https://schaledb.com/data/en";
const ICON_URL = "https://schaledb.com/images/student/icon";
const HEADERS = { "User-Agent": "baheardle.com build script" };

const TABLE_PATH = "src/constants/students.ts";
const ORDER_PATH = "src/constants/studentDailyOrder.ts";
const BIRTHDAYS_PATH = "src/constants/studentBirthdays.ts";
const ICON_CACHE = ".cache/student-icons";
const SHEET_PATH = `pictures/${ICON_SHEET_KEY}.webp`;
/**
 * WebP quality for the sheet: about 380 KB for 262 students, where their
 * separate icons on SchaleDB come to 2 MB.
 */
const SHEET_QUALITY = 70;

/** Fixed seeds, like the OST's: only new students are ever shuffled. */
const SEEDS = { gameplay: 20260928, lore: 20260929 };

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

// One birthday a student: the costumes share theirs.
const birthdays = lore
  .filter(({ birthday }) => birthday)
  .map(({ id, name, birthday }) => ({ id, name, birthday }));
writeFileSync(
  BIRTHDAYS_PATH,
  `import { StudentBirthday } from "../types/student";

/**
 * Each student's birthday, from students.ts, for the birthday note: small
 * enough for the page to carry without the whole table.
 *
 * GENERATED FILE - do not edit by hand. Run \`npm run students\`.
 */
export const studentBirthdays: StudentBirthday[] = ${JSON.stringify(birthdays)};
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
  const response = await fetch(`${ICON_URL}/${id}.webp`, { headers: HEADERS });
  if (!response.ok) throw new Error(`No icon for ${name}: ${response.status}`);
  writeFileSync(iconPath(id), Buffer.from(await response.arrayBuffer()));
  await new Promise((resolve) => setTimeout(resolve, 200));
}
console.log(`${missing.length} new icon(s) downloaded.`);

// The sheet: each icon scaled into its cell, set on the background, tiled.
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
  const background = `0x${ICON_BACKGROUND.slice(1)}`;
  const filters = [
    `format=rgba,scale=${ICON_SIZE}:${ICON_SIZE}:flags=lanczos`,
    `pad=${ICON_CELL}:${ICON_CELL}:${margin}:${margin}:color=black@0`,
    "split[icon][under];",
    `[under]drawbox=c=${background}:t=fill[card];`,
    "[card][icon]overlay=format=auto,format=rgb24",
    `tile=${ICON_COLUMNS}x${rows}:color=${background}`,
  ]
    .join(",")
    .replaceAll(";,", ";");
  await run("ffmpeg", [
    ...["-v", "error", "-y", "-i", join(work, "%04d.webp")],
    ...["-vf", filters, "-frames:v", "1"],
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
