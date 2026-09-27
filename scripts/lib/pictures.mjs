import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { basename, join } from "node:path";

import { OUTPUT_DIR } from "./audio.mjs";

/** The pictures the Worker serves, by folder, e.g. pictures/seasons/. */
export const PICTURE_SOURCE_DIR = "pictures";
/** Where they go on the Worker, next to the audio. */
export const PICTURE_OUTPUT_DIR = join(OUTPUT_DIR, "pictures");
export const PICTURE_MANIFEST_PATH = "src/constants/pictureFiles.ts";

/**
 * Every picture in pictures/, as the key the game looks it up by
 * ("seasons/christmas-day") and its path.
 */
export function listPictures() {
  if (!existsSync(PICTURE_SOURCE_DIR)) return [];

  return readdirSync(PICTURE_SOURCE_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .flatMap((folder) =>
      readdirSync(join(PICTURE_SOURCE_DIR, folder.name))
        .filter((file) => file.endsWith(".webp"))
        .map((file) => ({
          key: `${folder.name}/${basename(file, ".webp")}`,
          path: join(PICTURE_SOURCE_DIR, folder.name, file),
        }))
    )
    .sort((a, b) => a.key.localeCompare(b.key));
}

/**
 * A picture's name on the Worker: its own name and a fingerprint of its
 * bytes, so a changed picture gets a new name and every name can be cached
 * for a year.
 */
export function pictureFile({ key, path }) {
  const hash = createHash("sha256")
    .update(readFileSync(path))
    .digest("hex")
    .slice(0, 8);
  return `${basename(key)}.${hash}.webp`;
}

/** The entries in pictureFiles.ts: key to its path on the Worker. */
export function loadPictureManifest() {
  if (!existsSync(PICTURE_MANIFEST_PATH)) return new Map();

  const source = readFileSync(PICTURE_MANIFEST_PATH, "utf8");
  const pattern = /"([\w/-]+)": "(pictures\/[\w.-]+)"/g;
  return new Map(
    [...source.matchAll(pattern)].map(([, key, file]) => [key, file])
  );
}
