/**
 * react-youtube's own typings point at `youtube-player/dist/types`, which only
 * ships Flow types, so `event.target` degrades to `any`. This is the slice of
 * the player API the game actually uses.
 *
 * IMPORTANT: this describes the raw `YT.Player` that the IFrame API passes to
 * event handlers, so every method here is SYNCHRONOUS. It is not the
 * youtube-player wrapper returned by `<YouTube ref>.internalPlayer`, whose
 * methods are all proxied through promises. Treating one as the other silently
 * calls `.then()` on a number.
 */
export interface YouTubePlayerApi {
  playVideo(): void;
  pauseVideo(): void;
  seekTo(seconds: number, allowSeekAhead?: boolean): void;
  setVolume(volume: number): void;
  getCurrentTime(): number;
  getDuration(): number;
  getIframe(): HTMLIFrameElement | null;
}

export interface YouTubeReadyEvent {
  target: YouTubePlayerApi;
}

/**
 * `data` carries the IFrame API's error code: 2 is a malformed id, 5 an HTML5
 * playback failure, 100 a removed or private video, and 101/150 a video whose
 * owner disallowed embedding. All of them mean the same thing to this game -
 * the track cannot be heard here.
 */
export interface YouTubeErrorEvent {
  data: number;
  target?: YouTubePlayerApi;
}
