import { audioClips } from "../constants/audioClips";
import { clipFile, songFile } from "./audioFiles";

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
