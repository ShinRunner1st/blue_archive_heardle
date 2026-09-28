/**
 * How the silhouette sheet is laid out, shared by the game and
 * scripts/build-voices.mjs, which draws it.
 *
 * Voice mode's last hint is the answer's silhouette: their icon as a plain
 * shape. They are drawn at build time, never by darkening the real icon on
 * the page, which DevTools could undo. They sit in a sheet of their own, in
 * a shuffled order (silhouettes.ts), so a cell's place doesn't match the
 * icon sheet's.
 *
 * No imports: the build script loads this file directly with Node.
 */

/** The sheet's key in pictureFiles. */
export const SILHOUETTE_SHEET_KEY = "voices/silhouettes";

/** Each cell's size in pixels: a multiple of 16. */
export const SILHOUETTE_CELL = 128;

/**
 * The shape inside it: SchaleDB's icons are 120 pixels, and the hint shows
 * at 60, so phone screens get every pixel there is.
 */
export const SILHOUETTE_SIZE = 120;

export const SILHOUETTE_COLUMNS = 16;
