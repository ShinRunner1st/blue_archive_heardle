/**
 * Chrome's media controls otherwise label the track with its file name, which
 * gives the theme number away. This only keeps the answer out of casual view:
 * anyone with DevTools can still see which file was requested.
 */
export function hideTrackFromMediaSession(): void {
  if (!("mediaSession" in navigator)) return;
  if (typeof MediaMetadata === "undefined") return;

  navigator.mediaSession.metadata = new MediaMetadata({
    title: "Guess the OST",
    artist: "Blue Archive OST",
    album: "BA OST Guess",
  });
}
