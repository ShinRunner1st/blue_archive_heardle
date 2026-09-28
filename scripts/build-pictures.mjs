/**
 * Copies the pictures in pictures/ to audio-dist/pictures/, so `npm run
 * upload:audio` puts them on the Worker with the audio: requests for them are
 * free there, where Vercel would count every one.
 *
 * Each is named after its fingerprint (see scripts/lib/pictures.mjs), and
 * src/constants/pictureFiles.ts records the names for the game. Anything else
 * in audio-dist/pictures/ is removed, so an old picture can't linger there.
 * `npm run songs` runs this before every upload: an upload without the
 * pictures would take them off the Worker.
 */
import {
  copyFileSync,
  mkdirSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";

import { OUTPUT_DIR, writeHeaders } from "./lib/audio.mjs";
import {
  PICTURE_MANIFEST_PATH,
  PICTURE_OUTPUT_DIR,
  PORTRAIT_MANIFEST_PATH,
  listPictures,
  manifestPathFor,
  pictureFile,
} from "./lib/pictures.mjs";

const pictures = listPictures().map((picture) => ({
  ...picture,
  file: pictureFile(picture),
}));

mkdirSync(PICTURE_OUTPUT_DIR, { recursive: true });
for (const { path, file } of pictures) {
  copyFileSync(path, join(PICTURE_OUTPUT_DIR, file));
}

const expected = new Set(pictures.map(({ file }) => file));
const stale = readdirSync(PICTURE_OUTPUT_DIR).filter(
  (file) => !expected.has(file)
);
for (const file of stale) rmSync(join(PICTURE_OUTPUT_DIR, file));

writeHeaders(OUTPUT_DIR);

const lines = (path) =>
  pictures
    .filter(({ key }) => manifestPathFor(key) === path)
    .map(({ key, file }) => `  "${key}": "pictures/${file}",`)
    .join("\n");
writeFileSync(
  PICTURE_MANIFEST_PATH,
  `/**
 * The pictures served from the Worker, by their path in pictures/, and their
 * names there, which change whenever a picture does. The portraits are in
 * portraitFiles.ts.
 *
 * GENERATED FILE - do not edit by hand. Run \`npm run songs\`.
 */
export const pictureFiles: Record<string, string> = {
${lines(PICTURE_MANIFEST_PATH)}
};
`
);
writeFileSync(
  PORTRAIT_MANIFEST_PATH,
  `/**
 * The students' portraits on the Worker, by "portraits/<student id>", for
 * the Sensei card, which loads this file with it: the page doesn't carry it
 * otherwise.
 *
 * GENERATED FILE - do not edit by hand. Run \`npm run songs\`.
 */
export const portraitFiles: Record<string, string> = {
${lines(PORTRAIT_MANIFEST_PATH)}
};
`
);

console.log(`${pictures.length} pictures in ${PICTURE_OUTPUT_DIR}.`);
if (stale.length > 0) console.log(`Removed ${stale.length} stale file(s).`);
