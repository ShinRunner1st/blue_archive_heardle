/**
 * How a song maps to its audio files, shared by the game and the build
 * scripts (build-audio, check-audio) so the two can never disagree.
 *
 * Each song has two files, served from Cloudflare (see audio-worker/):
 * - its clip: the only part a round downloads, CLIP_SECONDS long;
 * - the whole song, fetched on the result screen when the player presses play.
 *
 * The names are a salted hash of the theme number and the song's version (a
 * fingerprint of its original), so a request in DevTools says nothing about
 * which song is playing, and a replaced song gets new names - which lets
 * browsers cache every file for good. Changing SALT renames every file; run
 * `npm run songs` afterwards.
 *
 * No imports: the build scripts load this file directly with Node.
 */

/** As long as the longest try (see playTimes); a test keeps them equal. */
export const CLIP_SECONDS = 16;

const SALT = "arona/plana";

/** cyrb53: a small, well-spread string hash, as a short base-36 name. */
function hash(text: string): string {
  const input = `${SALT}/${text}`;
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;

  for (let i = 0; i < input.length; i++) {
    const code = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ code, 2654435761);
    h2 = Math.imul(h2 ^ code, 1597334677);
  }

  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);

  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

export function clipFile(themeNo: string, version: string): string {
  return `${hash(`clip/${themeNo}/${version}`)}.ogg`;
}

export function songFile(themeNo: string, version: string): string {
  return `${hash(`song/${themeNo}/${version}`)}.ogg`;
}

/**
 * Where in the song its clip is cut, as a fraction (0-1) of the room there is.
 * Fixed per song, so everyone hears the same clip and rebuilding never moves
 * one.
 */
export function clipPosition(themeNo: string): number {
  return (parseInt(hash(`start/${themeNo}`), 36) % 10000) / 10000;
}

/** The original file a song is built from, in the audio/ folder. */
export function sourceFile(themeNo: string): string {
  return `Theme_${themeNo.padStart(2, "0")}.ogg`;
}
