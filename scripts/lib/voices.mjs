import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { OUTPUT_DIR } from "./audio.mjs";

/** The lines as downloaded, a folder per student (see build-voices). */
export const VOICE_DIR = "voices";
/** Which lines each student has, and their text. */
export const VOICE_LIST_PATH = join(VOICE_DIR, "lines.json");
/** Where they go on the Worker, next to the OST. */
export const VOICE_OUTPUT_DIR = join(OUTPUT_DIR, "voices");
export const VOICE_MANIFEST_PATH = "src/constants/voiceLines.ts";

/**
 * The lines in voices/lines.json: student id to their lines, the title call
 * first, as { file, text }. Empty before `npm run voices` first runs.
 */
export function loadVoiceList() {
  if (!existsSync(VOICE_LIST_PATH)) return {};
  return JSON.parse(readFileSync(VOICE_LIST_PATH, "utf8"));
}

/**
 * Each student's lines as files in voices/, and their version: a fingerprint
 * of all of them, in order. Any line missing is a problem.
 */
export function voiceVersions(list) {
  const students = new Map();
  const problems = [];
  for (const [id, lines] of Object.entries(list)) {
    const sources = lines.map(({ file }) => join(VOICE_DIR, id, file));
    const absent = sources.filter((source) => !existsSync(source));
    if (absent.length > 0) {
      problems.push(...absent.map((source) => `no line at ${source}`));
      continue;
    }
    const hash = createHash("sha256");
    for (const source of sources) hash.update(readFileSync(source));
    students.set(Number(id), {
      v: hash.digest("hex").slice(0, 8),
      sources,
    });
  }
  return { students, problems };
}

/** What voiceLines.ts says: [count, version] by id, and the texts file. */
export function loadVoiceManifest() {
  if (!existsSync(VOICE_MANIFEST_PATH)) {
    return { lines: new Map(), texts: null };
  }
  const source = readFileSync(VOICE_MANIFEST_PATH, "utf8");
  const lines = new Map(
    [...source.matchAll(/(\d+): \[(\d+), "(\w+)"\]/g)].map(
      ([, id, count, v]) => [Number(id), { count: Number(count), v }]
    )
  );
  const texts = /VOICE_TEXTS = "([^"]+)"/.exec(source)?.[1] ?? null;
  return { lines, texts };
}
