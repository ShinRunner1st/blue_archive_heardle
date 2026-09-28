/**
 * Copies audio-dist/ to the backup on Cloudflare R2, which the game falls
 * back to when the Worker fails (see src/helpers/audioSource.ts). `npm run
 * songs` runs it after the Worker upload.
 *
 * Only files the backup doesn't have yet are uploaded: every upload is an R2
 * write, and the free plan allows a million a month. A file's name changes
 * whenever its bytes do, so one already there never needs replacing. Old
 * files are left behind; they are small, and nothing asks for them.
 */
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  CACHE_CONTROL,
  OUTPUT_DIR,
  R2_BUCKET,
  checkServerFile,
  listOutputFiles,
  loadAudioBackupUrl,
} from "./lib/audio.mjs";

const TYPES = { ".ogg": "audio/ogg", ".webp": "image/webp" };

const backup = loadAudioBackupUrl();
if (!backup) {
  console.error("No VITE_AUDIO_BACKUP_URL in .env.production.");
  process.exit(1);
}

const files = listOutputFiles();
const unknown = files.filter((file) => !typeOf(file));
if (unknown.length > 0) {
  console.error(`No content type for: ${unknown.join(", ")}`);
  process.exit(1);
}

// Ask a few at a time, like check-audio.
const missing = [];
let next = 0;
const asker = async () => {
  while (next < files.length) {
    const file = files[next++];
    if (await checkServerFile(`${backup}/${file}`)) missing.push(file);
  }
};
await Promise.all(Array.from({ length: 8 }, asker));

console.log(`${files.length - missing.length} file(s) already on ${backup}.`);
if (missing.length === 0) process.exit(0);

// One bulk upload per content type, since Wrangler sets one for all of them.
const work = mkdtempSync(join(tmpdir(), "r2-upload-"));
try {
  for (const [extension, type] of Object.entries(TYPES)) {
    const batch = missing.filter((file) => file.endsWith(extension));
    if (batch.length === 0) continue;

    const list = join(work, `${extension.slice(1)}.json`);
    const entries = batch.map((key) => ({ key, file: join(OUTPUT_DIR, key) }));
    writeFileSync(list, JSON.stringify(entries));

    console.log(`Uploading ${batch.length} ${extension} file(s) to R2...`);
    // One command line, since npx needs a shell on Windows. --force answers
    // Wrangler's "may overwrite" question: only missing files are in the list.
    const command = [
      "npx --yes wrangler r2 bulk put",
      R2_BUCKET,
      "--remote --force",
      `--filename "${list}"`,
      `--content-type ${type}`,
      `--cache-control "${CACHE_CONTROL}"`,
    ].join(" ");
    const result = spawnSync(command, { stdio: "inherit", shell: true });
    if (result.status !== 0) process.exit(result.status ?? 1);
  }
} finally {
  rmSync(work, { recursive: true, force: true });
}

function typeOf(file) {
  return Object.entries(TYPES).find(([extension]) =>
    file.endsWith(extension)
  )?.[1];
}
