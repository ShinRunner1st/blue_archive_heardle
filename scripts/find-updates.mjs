/**
 * The weekly Action's first step (.github/workflows/content-update.yml): is
 * there anything new to add? It looks without building anything:
 *
 * - students out on JP or Global that the table doesn't have, or that have
 *   come out on Global since (SchaleDB's data, converted as the table is);
 * - voice lines SchaleDB now has for a student whose lines differ from
 *   voices/lines.json, as when a JP-only student's lines come out, or come
 *   into English with Global (only if the first new line can be downloaded);
 * - halos the Fandom wiki now has for a student without one;
 * - tracks on the Blue Archive wiki's Music page the song list doesn't have,
 *   and titles or artists for songs still waiting for them.
 *
 * It reports `changed=true|false` to the Action, and writes what it found to
 * UPDATE_SUMMARY, for the pull request. The build that follows does the
 * work; if it turns out to change nothing, no pull request is made.
 *
 *   node scripts/find-updates.mjs
 */
import { appendFileSync, readFileSync } from "node:fs";
import { basename } from "node:path";

import { songs } from "../src/constants/songs.ts";
import { convertStudents } from "../src/helpers/studentData.ts";
import { pickAllLines } from "../src/helpers/voiceData.ts";
import { haloKey, wikiName } from "./lib/halos.mjs";
import { loadStudentTable } from "./lib/studentTable.mjs";
import { trackChanges } from "./lib/wikiTracks.mjs";

const SCHALEDB = "https://schaledb.com/data";
const VOICE_URL = "https://r2.schaledb.com/voice";
const FANDOM_API = "https://blue-archive.fandom.com/api.php";
const HEADERS = { "User-Agent": "baheardle.com build script" };

async function getJson(url) {
  const response = await fetch(url, { headers: HEADERS });
  if (!response.ok) throw new Error(`${url}: ${response.status}`);
  return response.json();
}

const found = [];
const table = await loadStudentTable();
const inTable = new Map(table.map((student) => [student.id, student]));

// Students: new ones, and ones now out on Global.
const [raw, localization, items] = await Promise.all(
  ["students", "localization", "items"].map((name) =>
    getJson(`${SCHALEDB}/en/${name}.json`)
  )
);
for (const student of convertStudents(raw, localization, items)) {
  const had = inTable.get(student.id);
  if (!had) {
    found.push(
      `- New student: ${student.name}${student.global ? "" : " (JP only)"}`
    );
  } else if (student.global && !had.global) {
    found.push(`- Now on Global: ${student.name}`);
  }
}

// Voice lines: a student whose picked lines differ, if SchaleDB has them.
const [voices, jpStudents] = await Promise.all([
  getJson(`${SCHALEDB}/en/voice.json`),
  getJson(`${SCHALEDB}/jp/students.json`),
]);
const withNames = table.map((student) => {
  const jp = jpStudents[String(student.id)];
  return {
    ...student,
    nativeNames: jp
      ? [jp.PersonalName, jp.FamilyName, jp.FamilyNameRuby].filter(
          (name) => typeof name === "string" && name.length > 0
        )
      : [],
  };
});
const listed = JSON.parse(readFileSync("voices/lines.json", "utf8"));
const { lines } = pickAllLines(voices, withNames);
for (const [id, picked] of lines) {
  const have = new Set((listed[id] ?? []).map(({ file }) => file));
  const fresh = picked.filter(
    ({ clip }) => !have.has(`${basename(clip, ".mp3")}.ogg`)
  );
  if (fresh.length === 0) continue;
  const response = await fetch(`${VOICE_URL}/${fresh[0].clip}`, {
    method: "HEAD",
    headers: HEADERS,
  });
  const type = response.headers.get("content-type") ?? "";
  if (response.ok && type.startsWith("audio/")) {
    found.push(`- Voice lines: ${inTable.get(id)?.name ?? id}`);
  }
}

// Halos: a student without one, if the wiki has it now.
const cells = JSON.parse(readFileSync("pictures/guess/cells.json", "utf8"));
const haloed = new Set(
  (cells.halo ?? "").split(",").map((cell) => cell.split(":")[0])
);
const missingHalos = [
  ...new Set(table.map(({ name }) => haloKey(name))),
].filter((key) => !haloed.has(key));
if (missingHalos.length > 0) {
  const url = new URL(FANDOM_API);
  url.search = new URLSearchParams({
    action: "query",
    format: "json",
    prop: "imageinfo",
    iiprop: "url",
    titles: missingHalos
      .map((key) => `File:${wikiName(key)} Halo.png`)
      .join("|"),
  });
  const answer = await getJson(url);
  for (const page of Object.values(answer?.query?.pages ?? {})) {
    if (page.imageinfo?.[0]?.url) {
      found.push(`- Halo: ${page.title.replace(/^File:| Halo\.png$/g, "")}`);
    }
  }
}

// Songs: new tracks, and names for placeholders. Counted, not listed:
// build-new-songs.mjs lists them, with their names, as it adds them.
const { added, named } = await trackChanges(songs);
const songChanges = added.length + named.length;

const changed = found.length > 0 || songChanges > 0;
console.log(
  changed
    ? [...found, `${songChanges} song change(s) on the wiki.`].join("\n")
    : "Nothing new."
);
if (process.env.GITHUB_OUTPUT) {
  appendFileSync(process.env.GITHUB_OUTPUT, `changed=${changed}\n`);
}
if (process.env.UPDATE_SUMMARY && found.length > 0) {
  appendFileSync(process.env.UPDATE_SUMMARY, `${found.join("\n")}\n`);
}
