/**
 * Where the audio lives. Defaults to the files deployed from `public/audio`;
 * set VITE_AUDIO_BASE_URL (no trailing slash) to serve them from a CDN instead.
 * `||` rather than `??` on purpose: an empty value in a .env file comes
 * through as "", which would otherwise point every request at the site root.
 */
function audioBaseUrl(): string {
  return import.meta.env.VITE_AUDIO_BASE_URL || "/audio";
}

/**
 * The one place that knows how a song maps to its file. Themes below 10 are
 * zero-padded on disk (Theme_01.ogg) while their themeNo is "1".
 */
export function getAudioUrl(themeNo: string): string {
  return `${audioBaseUrl()}/Theme_${themeNo.padStart(2, "0")}.ogg`;
}
