/**
 * Puts the Voice mode lines in voices/ into audio-dist/voices/, for `npm run
 * upload:audio` to put on the Worker. `npm run songs` runs it.
 *
 * Each line is copied as it is, under a name that says nothing about who is
 * speaking (see voiceFile in src/helpers/audioFiles.ts). The lines' English
 * text goes in one file beside them, which the result screen reads once a
 * round is over. src/constants/voiceLines.ts tells the game how many lines
 * each student has, and their version. Anything else in audio-dist/voices/
 * is removed, so an old name can't linger there.
 */
import { createHash } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";

import { voiceFile } from "../src/helpers/audioFiles.ts";
import { OUTPUT_DIR } from "./lib/audio.mjs";
import {
  VOICE_MANIFEST_PATH,
  VOICE_OUTPUT_DIR,
  loadVoiceList,
  voiceVersions,
} from "./lib/voices.mjs";

const list = loadVoiceList();
const versions = voiceVersions(list);
if (versions.problems.length > 0) {
  for (const problem of versions.problems) console.error(problem);
  console.error("Run `npm run voices` first.");
  process.exit(1);
}

mkdirSync(VOICE_OUTPUT_DIR, { recursive: true });
const expected = new Set();
let copied = 0;
for (const [id, { v, sources }] of versions.students) {
  sources.forEach((source, line) => {
    const file = voiceFile(id, line, v);
    expected.add(file);
    const output = join(OUTPUT_DIR, file);
    if (existsSync(output)) return;
    copyFileSync(source, output);
    copied += 1;
  });
}

const texts = Object.fromEntries(
  Object.entries(list).map(([id, lines]) => [id, lines.map(({ text }) => text)])
);
const json = JSON.stringify(texts);
const textsFile = `voices/texts.${createHash("sha256")
  .update(json)
  .digest("hex")
  .slice(0, 8)}.json`;
writeFileSync(join(OUTPUT_DIR, textsFile), json);
expected.add(textsFile);

const stale = readdirSync(VOICE_OUTPUT_DIR).filter(
  (file) => !expected.has(`voices/${file}`)
);
for (const file of stale) rmSync(join(VOICE_OUTPUT_DIR, file));

const entries = [...versions.students].map(
  ([id, { v, sources }]) => `  ${id}: [${sources.length}, "${v}"],`
);
writeFileSync(
  VOICE_MANIFEST_PATH,
  `/**
 * How many Voice mode lines each student has, by id, and their version,
 * which names their files on the Worker (see voiceFile in
 * helpers/audioFiles.ts). Line 0 is the title call, when they have one. The
 * lines' text is in VOICE_TEXTS, read once a round is over.
 *
 * GENERATED FILE - do not edit by hand. Run \`npm run songs\`.
 */
export const voiceLines: Record<number, [count: number, version: string]> = {
${entries.join("\n")}
};

export const VOICE_TEXTS = "${textsFile}";
`
);

const bytes = [...expected].reduce(
  (sum, file) => sum + readFileSync(join(OUTPUT_DIR, file)).length,
  0
);
console.log(
  `${expected.size - 1} lines in ${VOICE_OUTPUT_DIR}: ${copied} new, ${(
    bytes /
    1024 /
    1024
  ).toFixed(1)} MB.`
);
if (stale.length > 0) console.log(`Removed ${stale.length} stale file(s).`);
