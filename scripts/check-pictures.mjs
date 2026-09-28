/**
 * Verifies pictureFiles.ts matches the pictures in pictures/: fails on a
 * picture added or changed without `npm run songs`. CI runs this on every
 * push.
 *
 * With --remote it also asks both servers in .env.production, the Worker and
 * the backup on R2, for every picture, so nothing goes live pointing at a
 * picture that was never uploaded.
 */
import { checkServerFile, loadServers } from "./lib/audio.mjs";
import {
  PICTURE_SOURCE_DIR,
  listPictures,
  loadPictureManifest,
  pictureFile,
} from "./lib/pictures.mjs";

const pictures = listPictures();
const manifest = loadPictureManifest();
const problems = [];

for (const picture of pictures) {
  if (manifest.get(picture.key) !== `pictures/${pictureFile(picture)}`) {
    problems.push(`not built from its current file: ${picture.path}`);
  }
}

const known = new Set(pictures.map(({ key }) => key));
for (const key of manifest.keys()) {
  if (!known.has(key)) {
    problems.push(`built, but not in ${PICTURE_SOURCE_DIR}/: ${key}`);
  }
}

if (process.argv.includes("--remote")) {
  for (const base of loadServers(problems)) {
    for (const file of manifest.values()) {
      const problem = await checkServerFile(`${base}/${file}`);
      if (problem) problems.push(problem);
    }
    console.log(`Asked ${base} for ${manifest.size} pictures.`);
  }
}

console.log(`Checked ${pictures.length} pictures.`);

if (problems.length === 0) process.exit(0);

console.error(`\n${problems.length} problem(s) - run \`npm run songs\`:`);
for (const problem of problems) console.error(`  ${problem}`);
process.exit(1);
