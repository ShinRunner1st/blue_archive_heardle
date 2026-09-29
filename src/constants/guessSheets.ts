/**
 * How the halo and weapon sheets are laid out, shared by the game and
 * scripts/build-guess-pictures.mjs, which draws them.
 *
 * Each kind has two sheets: the pictures as they are, and their shapes in
 * white for the silhouette way to play. Both are drawn at build time, never
 * by darkening the real picture on the page, which DevTools could undo, and
 * each has an order of its own (guessPictures.ts), so a cell's place in one
 * doesn't match the other.
 *
 * No imports: the build script loads this file directly with Node.
 */

/** The two things a student can be named from. */
export type PictureKind = "halo" | "weapon";

export const PICTURE_KINDS: PictureKind[] = ["halo", "weapon"];

export interface SheetLayout {
  /** The sheet's key in pictureFiles. */
  key: string;
  /** Each cell's size in pixels: multiples of 16. */
  cellWidth: number;
  cellHeight: number;
  /** The box the picture is fitted into, centred in its cell. */
  width: number;
  height: number;
  columns: number;
}

/**
 * Halos are round-ish and show at 144 pixels. They're drawn at one and a
 * half times that: twice made each sheet about 850 KB, and phone screens
 * showed no difference worth it.
 */
const HALO_BOX = { cellWidth: 224, cellHeight: 224, width: 216, height: 216 };

/**
 * Weapons are long, from a pistol to a sniper rifle, and show at 240 by 96
 * pixels, drawn at one and a half times that: a rifle fills the width, a
 * pistol the height.
 */
const WEAPON_BOX = { cellWidth: 368, cellHeight: 160, width: 360, height: 144 };

export const PICTURE_SHEETS: Record<PictureKind, SheetLayout> = {
  halo: { key: "guess/halos", columns: 12, ...HALO_BOX },
  weapon: { key: "guess/weapons", columns: 8, ...WEAPON_BOX },
};

export const SHAPE_SHEETS: Record<PictureKind, SheetLayout> = {
  halo: { key: "guess/halo-shapes", columns: 12, ...HALO_BOX },
  weapon: { key: "guess/weapon-shapes", columns: 8, ...WEAPON_BOX },
};

/** How big each kind shows during a round, in CSS pixels. */
export const SHOWN_SIZE: Record<
  PictureKind,
  { width: number; height: number }
> = {
  halo: { width: 144, height: 144 },
  weapon: { width: 240, height: 96 },
};
