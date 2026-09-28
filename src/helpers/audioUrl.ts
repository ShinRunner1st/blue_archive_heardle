import { audioClips } from "../constants/audioClips";
import { VOICE_TEXTS, voiceLines } from "../constants/voiceLines";
import { clipFile, songFile, voiceFile } from "./audioFiles";

/**
 * Where the audio, and the pictures served with it, live: the Worker in
 * production (VITE_AUDIO_BASE_URL, no trailing slash), or `/audio`, which
 * `npm run dev` serves from audio-dist/. `||` rather than `??` on purpose: an
 * empty value in a .env file comes through as "", which would otherwise point
 * every request at the site root.
 */
export function audioBaseUrl(): string {
  return import.meta.env.VITE_AUDIO_BASE_URL || "/audio";
}

/**
 * The copy of the same files on Cloudflare R2, tried when a file doesn't come
 * from the Worker (see loadAudio). The Worker stays first because its requests
 * are free and unlimited, where R2's free reads run out each month. Null when
 * there is no copy, as in `npm run dev`.
 */
export function audioBackupUrl(): string | null {
  return import.meta.env.VITE_AUDIO_BACKUP_URL || null;
}

/** The backup copy of a file on the Worker, if there is one. */
export function backupUrlFor(url: string): string | null {
  const base = audioBaseUrl();
  const backup = audioBackupUrl();
  if (!backup || !url.startsWith(`${base}/`)) return null;
  return backup + url.slice(base.length);
}

/**
 * Where a song's clip was cut from and how long the song is, in seconds, and
 * the version its file names carry. Known without downloading the song, so
 * the result screen can draw its timeline before the player chooses to listen.
 */
export function clipInfo(themeNo: string): {
  start: number;
  duration: number;
  v: string;
} {
  return audioClips[themeNo] ?? { start: 0, duration: 0, v: "" };
}

/** The round's clip: all a round downloads before it is over. */
export function getClipUrl(themeNo: string): string {
  return `${audioBaseUrl()}/${clipFile(themeNo, clipInfo(themeNo).v)}`;
}

/** The whole song, for the result screen. */
export function getSongUrl(themeNo: string): string {
  return `${audioBaseUrl()}/${songFile(themeNo, clipInfo(themeNo).v)}`;
}

/** A Voice mode line: the student, and which of their lines (0 up). */
export function getVoiceUrl(id: number, line: number): string {
  const version = voiceLines[id]?.[1] ?? "";
  return `${audioBaseUrl()}/${voiceFile(id, line, version)}`;
}

/** Every line's English text, in one file, read once a round is over. */
export function getVoiceTextsUrl(): string {
  return `${audioBaseUrl()}/${VOICE_TEXTS}`;
}
