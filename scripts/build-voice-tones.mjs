/**
 * Finds the voices that sound most alike, for Voice mode's 4-Choice: its
 * wrong answers come from the voices nearest the answer's, so a round asks
 * for an ear rather than a guess between four very different voices.
 * `npm run voices` (and so `npm run students`) runs it after build:voices.
 *
 * Each student's lines are measured (scripts/lib/voiceTone.mjs): pitch and
 * its spread, and timbre. The measures are cached in .cache/ by the version
 * of the student's lines, so a Global update only measures the new ones.
 * The measure was checked against costumes, which share a voice actress: a
 * student's other costume is typically the 5th nearest of 261 voices (it
 * would be about the 130th by chance), and the nearest for a third of them.
 *
 * Writes src/constants/voiceTones.ts: each student's nearest voices, one
 * costume per other student, never their own.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

import { loadStudentTable } from "./lib/studentTable.mjs";
import { measureVoice } from "./lib/voiceTone.mjs";
import { loadVoiceList, voiceVersions } from "./lib/voices.mjs";

const CACHE_PATH = ".cache/voice-tones.json";
const OUTPUT_PATH = "src/constants/voiceTones.ts";

/** How many near voices each student keeps: 4-Choice deals three of them. */
const NEAREST = 8;

/**
 * How much each measure counts, after each is scaled to the spread across
 * all students. Timbre tells voices apart best; pitch alone found a
 * student's other costume far less often. These found it most often.
 */
const WEIGHTS = { pitch: 1, spread: 0.5, timbre: 2 };

const { students: versions, problems } = voiceVersions(loadVoiceList());
if (problems.length > 0) {
  for (const problem of problems) console.error(problem);
  console.error("Run `npm run voices` first.");
  process.exit(1);
}

const cache = existsSync(CACHE_PATH)
  ? JSON.parse(readFileSync(CACHE_PATH, "utf8"))
  : {};
let measured = 0;
for (const [id, { v, sources }] of versions) {
  if (cache[id]?.v === v) continue;
  const voice = measureVoice(sources);
  if (voice) cache[id] = { v, ...voice };
  measured += 1;
}
mkdirSync(dirname(CACHE_PATH), { recursive: true });
writeFileSync(CACHE_PATH, JSON.stringify(cache));

const table = await loadStudentTable();
const students = table.filter(({ id }) => versions.has(id) && cache[id]);

// Every measure scaled to its spread across students, so each weighs what
// WEIGHTS says rather than what its units happen to be.
const rows = students.map(({ id }) => {
  const { pitch, spread, timbre } = cache[id];
  return [pitch, spread, ...timbre];
});
const dims = rows[0].length;
const scaled = (() => {
  const mean = Array.from(
    { length: dims },
    (_, d) => rows.reduce((sum, row) => sum + row[d], 0) / rows.length
  );
  const sd = Array.from({ length: dims }, (_, d) =>
    Math.sqrt(
      rows.reduce((sum, row) => sum + (row[d] - mean[d]) ** 2, 0) / rows.length
    )
  );
  return rows.map((row) => row.map((value, d) => (value - mean[d]) / sd[d]));
})();

function distance(a, b) {
  let timbre = 0;
  for (let d = 2; d < dims; d++) timbre += (scaled[a][d] - scaled[b][d]) ** 2;
  return Math.sqrt(
    WEIGHTS.pitch * (scaled[a][0] - scaled[b][0]) ** 2 +
      WEIGHTS.spread * (scaled[a][1] - scaled[b][1]) ** 2 +
      (WEIGHTS.timbre * timbre) / (dims - 2)
  );
}

const nearest = students.map((student, a) => {
  const order = students
    .map((_, b) => b)
    .filter((b) => students[b].fullName !== student.fullName)
    .sort((x, y) => distance(a, x) - distance(a, y));
  // One costume per student: two outfits of one voice would leave a guess
  // between outfits.
  const seen = new Set();
  const picked = [];
  for (const b of order) {
    if (seen.has(students[b].fullName)) continue;
    seen.add(students[b].fullName);
    picked.push(students[b].id);
    if (picked.length === NEAREST) break;
  }
  return [student.id, picked];
});

// A row for every student in the table, in its order, empty for a voice not
// measured, who gets 4-Choice's old way of dealing. Each near voice is its
// place in the table, two base-36 characters: half the size of the ids.
const place = new Map(table.map(({ id }, index) => [id, index]));
const code = (id) => place.get(id).toString(36).padStart(2, "0");
const byId = new Map(
  nearest.map(([id, picked]) => [id, picked.map(code).join("")])
);
const lines = table.map(({ id }) => `  "${byId.get(id) ?? ""}",`);

writeFileSync(
  OUTPUT_PATH,
  `/**
 * Each student's nearest voices, closest first: one costume per other
 * student, never their own. Voice mode's 4-Choice deals its wrong answers
 * from these (see makeVoiceChoices in helpers/voiceRounds.ts). A row for
 * each student in students.ts, in its order; each voice is two base-36
 * characters, its place in that table.
 *
 * GENERATED FILE - do not edit by hand. Run \`npm run voices\`.
 */
export const voiceNeighbours: string[] = [
${lines.join("\n")}
];
`
);

console.log(
  `Nearest voices for ${students.length} students (${measured} measured, the rest cached) in ${OUTPUT_PATH}.`
);
