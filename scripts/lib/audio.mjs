import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";

export const SOURCE_DIR = "audio";
export const OUTPUT_DIR = "audio-dist";
export const MANIFEST_PATH = "src/constants/audioClips.ts";
/** Where the game reads the audio from once it is built for production. */
export const ENV_PATH = ".env.production";
/** The R2 bucket holding the backup copy, served at VITE_AUDIO_BACKUP_URL. */
export const R2_BUCKET = "ba-heardle-audio";
/** The game's address: the one the files must let read them. */
const SITE_ORIGIN = "https://baheardle.com";
/**
 * The file names never change for the same bytes, so browsers and Cloudflare
 * can keep them for a year without asking again.
 */
export const CACHE_CONTROL = "public, max-age=31536000, immutable";

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

/** A value in .env.production, if set. */
function loadEnv(name) {
  if (!existsSync(ENV_PATH)) return null;

  const line = readFileSync(ENV_PATH, "utf8")
    .split(/\r?\n/)
    .find((text) => text.startsWith(`${name}=`));
  return line?.slice(name.length + 1).trim() || null;
}

/** The base URL the production build serves the audio from, if set up. */
export function loadAudioBaseUrl() {
  return loadEnv("VITE_AUDIO_BASE_URL");
}

/** Where the backup copy on R2 is served, if set up. */
export function loadAudioBackupUrl() {
  return loadEnv("VITE_AUDIO_BACKUP_URL");
}

/**
 * The servers in .env.production that the `--remote` checks ask: the Worker
 * and the backup on R2. Each one missing adds a problem.
 */
export function loadServers(problems) {
  const servers = [loadAudioBaseUrl(), loadAudioBackupUrl()];
  if (!servers[0]) problems.push("no VITE_AUDIO_BASE_URL in .env.production");
  if (!servers[1]) {
    problems.push("no VITE_AUDIO_BACKUP_URL in .env.production");
  }
  return servers.filter(Boolean);
}

/**
 * Asks a server for a file the way the game does: a problem to report, or
 * null when the game can have it. The query makes Cloudflare ask R2 itself
 * rather than answer from its cache, which may still hold a "not found" from
 * before the upload; R2 and the Worker ignore it.
 */
export async function checkServerFile(url) {
  const response = await fetch(`${url}?check=${Date.now()}`, {
    method: "HEAD",
    headers: { Origin: SITE_ORIGIN },
  }).catch(() => null);
  if (!response?.ok) {
    return `not on the server (${response?.status ?? "no answer"}): ${url}`;
  }
  if (!response.headers.get("access-control-allow-origin")) {
    return `no Access-Control-Allow-Origin, so the game can't read it: ${url}`;
  }
  return null;
}

/** Every file in audio-dist/ that goes on a server, as its path there. */
export function listOutputFiles(dir = OUTPUT_DIR) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return listOutputFiles(path);
    if (entry.name === "_headers") return [];
    return [relative(OUTPUT_DIR, path).split(sep).join("/")];
  });
}

/**
 * See CACHE_CONTROL. The game downloads the audio itself (see
 * src/helpers/audioSource.ts) and draws the pictures into share pictures, from
 * another address than its own, so it needs Access-Control-Allow-Origin to
 * read them.
 */
const HEADERS = `/*
  Cache-Control: ${CACHE_CONTROL}
  Access-Control-Allow-Origin: *
`;

/** Writes the headers above into `dir` for Cloudflare to send. */
export function writeHeaders(dir) {
  writeFileSync(join(dir, "_headers"), HEADERS);
}
