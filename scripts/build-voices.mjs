/**
 * Picks the voice lines for Voice mode, gets any new ones from SchaleDB, and
 * draws the silhouette sheet. Run `npm run voices` after `npm run students`
 * (`npm run students` runs it too); `npm run songs` then puts the lines on
 * the Worker and R2.
 *
 * - voices/<student id>/<name>.ogg: each line, converted once from
 *   SchaleDB's MP3 to mono Ogg Vorbis, like the OST's originals in audio/.
 *   They are committed, so the files on the Worker can be rebuilt without
 *   asking SchaleDB again. Which lines are picked is up to
 *   src/helpers/voiceData.ts.
 * - voices/lines.json: each student's lines in the table's order, the title
 *   call first, with their English text.
 * - src/constants/voiceDailyOrder.ts: each server's daily schedule, by
 *   student id, only ever appended to.
 * - pictures/voices/silhouettes.webp: every student's icon as a plain
 *   shape, for the last hint, in an order of its own
 *   (src/constants/silhouettes.ts), so its place in the sheet doesn't match
 *   the icon sheet's.
 *
 * SchaleDB was told before the lines were first downloaded. Only lines not in
 * voices/ yet are downloaded, one at a time with a pause, and the MP3s are
 * kept in .cache/ so a change of settings doesn't download them again.
 */
import { execFile } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import { promisify } from "node:util";

import { obscure, reveal } from "../src/helpers/obscure.ts";
import { pickAllLines } from "../src/helpers/voiceData.ts";
import {
  SILHOUETTE_CELL,
  SILHOUETTE_COLUMNS,
  SILHOUETTE_SHEET_KEY,
  SILHOUETTE_SIZE,
} from "../src/constants/voiceSheet.ts";
import { shuffled } from "./lib/shuffle.mjs";
import { loadStudentTable } from "./lib/studentTable.mjs";
import { VOICE_DIR, VOICE_LIST_PATH } from "./lib/voices.mjs";

const run = promisify(execFile);

const DATA_URL = "https://schaledb.com/data/en/voice.json";
/** For the students' Japanese names: a JP-only student's lines are Japanese. */
const JP_STUDENTS_URL = "https://schaledb.com/data/jp/students.json";
const VOICE_URL = "https://r2.schaledb.com/voice";
const IMAGES_URL = "https://schaledb.com/images";
const HEADERS = { "User-Agent": "baheardle.com build script" };
/** Between downloads, so SchaleDB never sees more than a trickle. */
const PAUSE_MS = 500;

const MP3_CACHE = ".cache/voices";
const ICON_CACHE = ".cache/student-icons";
const SHEET_PATH = `pictures/${SILHOUETTE_SHEET_KEY}.webp`;
const ORDER_PATH = "src/constants/silhouettes.ts";
const DAILY_ORDER_PATH = "src/constants/voiceDailyOrder.ts";
/** A fixed seed, so the same students always land in the same cells. */
const SILHOUETTE_SEED = 20261001;
/** Fixed, like the other schedules': only new students are ever shuffled. */
const DAILY_SEEDS = { VOICES: 20261002, VOICES_JP: 20261012 };
/**
 * Vorbis quality for the lines, mono: about 40 KB for a five-second line,
 * and a voice sounds no different from SchaleDB's MP3.
 */
const VORBIS_QUALITY = 3;
/**
 * The silhouettes' transparency, doubled so the little gaps inside a shape
 * fill in, and rounded to six steps as the icon sheet's is: about 150 KB,
 * where kept exactly it was 450 KB.
 */
const ALPHA_STEP = 51;

const pause = () => new Promise((resolve) => setTimeout(resolve, PAUSE_MS));

/** Saves a file from SchaleDB, unless it's there already: true if it is. */
async function downloadOnce(url, file, type) {
  if (existsSync(file)) return true;
  const response = await fetch(url, { headers: HEADERS });
  const got = response.headers.get("content-type") ?? "";
  await pause();
  if (!response.ok || !got.startsWith(type)) return false;
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, Buffer.from(await response.arrayBuffer()));
  return true;
}

const response = await fetch(DATA_URL, { headers: HEADERS });
if (!response.ok) throw new Error(`voice.json: ${response.status}`);
const voices = await response.json();

const jpResponse = await fetch(JP_STUDENTS_URL, { headers: HEADERS });
if (!jpResponse.ok) throw new Error(`jp students.json: ${jpResponse.status}`);
const jpStudents = await jpResponse.json();
const nativeNamesOf = (id) => {
  const entry = jpStudents[String(id)];
  return entry
    ? [entry.PersonalName, entry.FamilyName, entry.FamilyNameRuby].filter(
        (name) => typeof name === "string" && name.length > 0
      )
    : [];
};

const students = (await loadStudentTable()).map((student) => ({
  ...student,
  nativeNames: nativeNamesOf(student.id),
}));
const { lines, missing } = pickAllLines(voices, students);

// A list this short means something went wrong, not that voices left.
if (lines.size < 200) {
  console.error(`Only ${lines.size} students with lines: stopping.`);
  process.exit(1);
}
if (missing.length > 0) {
  console.log(`No lines yet for: ${missing.join(", ")}.`);
}

// The lines: each MP3 downloaded once, then converted once.
const oggOf = (id, clip) =>
  join(VOICE_DIR, String(id), `${basename(clip, ".mp3")}.ogg`);
const picked = [...lines].flatMap(([id, list]) =>
  list.map(({ clip }) => ({ id, clip }))
);
const needed = picked.filter(({ id, clip }) => !existsSync(oggOf(id, clip)));
console.log(
  `${picked.length} lines for ${lines.size} students, ${needed.length} new.`
);

// A line SchaleDB lists but doesn't have yet is left out, with a warning, so
// a run on its own (the weekly Action) isn't stopped by one missing file.
const failed = new Set();
let done = 0;
for (const { id, clip } of needed) {
  const mp3 = join(MP3_CACHE, clip);
  if (!(await downloadOnce(`${VOICE_URL}/${clip}`, mp3, "audio/"))) {
    console.warn(`  Could not download ${clip}: left out.`);
    failed.add(clip);
    continue;
  }
  const ogg = oggOf(id, clip);
  mkdirSync(dirname(ogg), { recursive: true });
  await run("ffmpeg", [
    ...["-v", "error", "-y", "-i", mp3, "-map", "0:a", "-ac", "1"],
    ...["-c:a", "libvorbis", "-q:a", String(VORBIS_QUALITY)],
    ...["-map_metadata", "-1", "-fflags", "+bitexact", ogg],
  ]);
  done += 1;
  if (done % 50 === 0) console.log(`  ${done}/${needed.length}`);
}

for (const [id, list] of lines) {
  const got = list.filter(({ clip }) => !failed.has(clip));
  if (got.length > 0) lines.set(id, got);
  else lines.delete(id);
}
const wanted = [...lines].flatMap(([id, list]) =>
  list.map(({ clip }) => ({ id, clip }))
);

// Lines no longer picked go, so voices/ holds only what's played.
const kept = new Set(wanted.map(({ id, clip }) => oggOf(id, clip)));
let removed = 0;
if (existsSync(VOICE_DIR)) {
  for (const folder of readdirSync(VOICE_DIR, { withFileTypes: true })) {
    if (!folder.isDirectory()) continue;
    const path = join(VOICE_DIR, folder.name);
    for (const file of readdirSync(path)) {
      if (!kept.has(join(path, file))) {
        rmSync(join(path, file));
        removed += 1;
      }
    }
    if (readdirSync(path).length === 0) rmSync(path, { recursive: true });
  }
}
if (removed > 0) console.log(`Removed ${removed} line(s) no longer picked.`);

const list = Object.fromEntries(
  [...lines].map(([id, picked]) => [
    id,
    picked.map(({ clip, text }) => ({
      file: basename(oggOf(id, clip)),
      text,
    })),
  ])
);
writeFileSync(VOICE_LIST_PATH, `${JSON.stringify(list, null, 1)}\n`);

// Each server's daily schedule: only ever appended to, like the others, so a
// new student can't change a day already played.
const orderSource = existsSync(DAILY_ORDER_PATH)
  ? readFileSync(DAILY_ORDER_PATH, "utf8")
  : null;
const onServer = new Map(
  students.map(({ id, global, jp }) => [id, { global, jp }])
);
const daily = {};
for (const [name, server] of [
  ["VOICES", "global"],
  ["VOICES_JP", "jp"],
]) {
  const stored = orderSource?.match(new RegExp(`const ${name} =\\s*"([^"]*)"`));
  const scheduled = stored
    ? (reveal(stored[1]) ?? "").split(",").filter(Boolean).map(Number)
    : [];
  const unscheduled = [...lines.keys()].filter(
    (id) => onServer.get(id)?.[server] && !scheduled.includes(id)
  );
  daily[name] = [
    ...scheduled,
    ...shuffled(unscheduled, DAILY_SEEDS[name] + scheduled.length),
  ];
  console.log(
    `Daily ${name}: ${scheduled.length} scheduled, ${unscheduled.length} added.`
  );
}
writeFileSync(
  DAILY_ORDER_PATH,
  `import { reveal } from "../helpers/obscure";

/**
 * The order daily Voice puzzles are dealt in, by student id, on each server.
 *
 * GENERATED FILE - do not edit by hand. Run \`npm run voices\`.
 *
 * Entries are never reordered, only appended, so a new student can't change a
 * day already played. Stored scrambled, so the days ahead can't be read off
 * the code.
 */
const VOICES = "${obscure(daily.VOICES.join(","))}";
const VOICES_JP = "${obscure(daily.VOICES_JP.join(","))}";

const ids = (text: string) => (reveal(text) ?? "").split(",").map(Number);

export const voiceOrder: number[] = ids(VOICES);
export const voiceOrderJp: number[] = ids(VOICES_JP);
`
);

const kb = (path) => statSync(path).size / 1024;
const totalKb = [...kept].reduce((sum, path) => sum + kb(path), 0);
console.log(
  `${VOICE_DIR}/: ${kept.size} lines, ${(totalKb / 1024).toFixed(1)} MB.`
);

// The silhouettes: each icon's shape in white, which the game colours to
// suit the page, in a shuffled order.
mkdirSync(ICON_CACHE, { recursive: true });
const ids = [...lines.keys()];
for (const id of ids) {
  const icon = join(ICON_CACHE, `${id}.webp`);
  if (
    !(await downloadOnce(
      `${IMAGES_URL}/student/icon/${id}.webp`,
      icon,
      "image/"
    ))
  ) {
    throw new Error(`No icon for student ${id}`);
  }
}
const order = shuffled(ids, SILHOUETTE_SEED);
const rows = Math.ceil(order.length / SILHOUETTE_COLUMNS);
const margin = (SILHOUETTE_CELL - SILHOUETTE_SIZE) / 2;
const work = mkdtempSync(join(tmpdir(), "silhouettes-"));
try {
  order.forEach((id, index) => {
    copyFileSync(
      join(ICON_CACHE, `${id}.webp`),
      join(work, `${String(index).padStart(4, "0")}.webp`)
    );
  });
  mkdirSync(dirname(SHEET_PATH), { recursive: true });
  await run("ffmpeg", [
    ...["-v", "error", "-y", "-i", join(work, "%04d.webp")],
    ...["-filter_complex"],
    [
      "format=rgba,",
      `scale=${SILHOUETTE_SIZE}:${SILHOUETTE_SIZE}:flags=lanczos,`,
      `geq=r=255:g=255:b=255:a='round(min(255,alpha(X,Y)*2)/${ALPHA_STEP})*${ALPHA_STEP}',`,
      `pad=${SILHOUETTE_CELL}:${SILHOUETTE_CELL}:${margin}:${margin}:color=white@0,`,
      `tile=${SILHOUETTE_COLUMNS}x${rows}:color=white@0`,
    ].join(""),
    ...["-frames:v", "1", "-c:v", "libwebp", "-lossless", "1"],
    ...["-compression_level", "6", "-map_metadata", "-1", SHEET_PATH],
  ]);
} finally {
  rmSync(work, { recursive: true, force: true });
}

writeFileSync(
  ORDER_PATH,
  `import { reveal } from "../helpers/obscure";

/**
 * Which student is in which cell of the silhouette sheet, by id, left to
 * right. Shuffled, so a silhouette's place gives nothing away, and stored
 * scrambled, so the list can't be read off the code at a glance.
 *
 * GENERATED FILE - do not edit by hand. Run \`npm run voices\`.
 */
const ORDER = "${obscure(order.join(","))}";

export const silhouetteOrder: number[] = (reveal(ORDER) ?? "")
  .split(",")
  .map(Number);
`
);

console.log(
  `${SHEET_PATH}: ${order.length} silhouettes, ${kb(SHEET_PATH).toFixed(1)} KB.`
);
