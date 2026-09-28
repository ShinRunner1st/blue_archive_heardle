/**
 * How the student icon sheet is laid out, shared by the game and
 * scripts/build-students.mjs, which draws it.
 *
 * Every icon sits in one picture on the Worker, a cell each in the student
 * table's order, left to right: one request for all of them, and no file name
 * per student to give the answer away in DevTools. Each cell leaves a few
 * pixels empty round its icon, so a neighbour can't bleed in when the browser
 * scales the sheet.
 *
 * No imports: the build script loads this file directly with Node.
 */

/** The sheet's key in pictureFiles. */
export const ICON_SHEET_KEY = "students/icons";

/** Each cell's size in pixels: a multiple of 16. */
export const ICON_CELL = 80;

/**
 * The icon inside it: twice the largest it shows (36 px, in the guess
 * table), for phone screens.
 */
export const ICON_SIZE = 72;

/**
 * The icons are cut-outs and the sheet keeps them so, on a faint square
 * that takes the page's own colour, day or night.
 */
export const ICON_TILE = "rgba(255, 255, 255, 0.12)";

export const ICON_COLUMNS = 16;

/**
 * The clue icons, in a sheet of their own: school, role and gift icons for
 * the table's cells. They are white shapes drawn over the cell's colour, so
 * this sheet keeps its transparency; it is small enough that it costs
 * little. Which icon is in which cell is in clueIcons.ts.
 */
export const CLUE_SHEET_KEY = "students/clues";

export const CLUE_CELL = 64;

/** Twice the size they show at (28 px). */
export const CLUE_SIZE = 56;

export const CLUE_COLUMNS = 8;
