import { VOLUMES } from "../constants/volumes";

let started = false;

/**
 * Starts downloading the album covers for the OST badges, once. Called when a
 * player points at or taps the badges button, so the covers are usually in
 * by the time the pop-up opens - and never fetched for anyone who doesn't
 * open it. After that the browser keeps them for a year.
 */
export function preloadCovers(): void {
  if (started) return;
  started = true;

  for (const volume of VOLUMES) {
    const image = new Image();
    image.decoding = "async";
    image.src = volume.cover;
  }
}
