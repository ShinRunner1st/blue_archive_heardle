import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";

export const SOURCE_DIR = "audio";
export const OUTPUT_DIR = "audio-dist";
export const MANIFEST_PATH = "src/constants/audioClips.ts";
/** Where the game reads the audio from once it is built for production. */
export const ENV_PATH = ".env.production";

/** A song's version: a short fingerprint of its original's bytes. */
export function versionOf(path) {
  return createHash("sha256")
    .update(readFileSync(path))
    .digest("hex")
    .slice(0, 8);
}

/** The entries in audioClips.ts, by theme number. */
export function loadManifest() {
  if (!existsSync(MANIFEST_PATH)) return new Map();

  const source = readFileSync(MANIFEST_PATH, "utf8");
  const entries = new Map();
  const pattern =
    /"([^"]+)": \{ start: ([\d.]+), duration: ([\d.]+), v: "(\w+)" \}/g;

  for (const [, themeNo, start, duration, v] of source.matchAll(pattern)) {
    entries.set(themeNo, {
      themeNo,
      start: Number(start),
      duration: Number(duration),
      v,
    });
  }
  return entries;
}

/** The base URL the production build serves the audio from, if set up. */
export function loadAudioBaseUrl() {
  if (!existsSync(ENV_PATH)) return null;

  const line = readFileSync(ENV_PATH, "utf8")
    .split(/\r?\n/)
    .find((text) => text.startsWith("VITE_AUDIO_BASE_URL="));
  return line ? line.slice("VITE_AUDIO_BASE_URL=".length).trim() : null;
}
