import { PICTURE_KINDS, PictureKind } from "../constants/guessSheets";

import { NamedRound } from "./voice";

export { PICTURE_KINDS };
export type { PictureKind };

export function isPictureKind(value: unknown): value is PictureKind {
  return PICTURE_KINDS.includes(value as PictureKind);
}

/**
 * The picture game's ways to play, for each kind, halo or weapon: daily,
 * Classic, Classic with the silhouette in place of the picture, 4-Choice
 * and time attack. Each keeps its own rounds, stats and streak.
 */
export type PictureMode =
  | "daily"
  | "endless"
  | "silhouette"
  | "choice"
  | "timeattack";

/** The modes played one round at a time, which usePictureGame runs. */
export type PictureRoundMode = Exclude<PictureMode, "timeattack">;

export const PICTURE_ROUND_MODES: PictureRoundMode[] = [
  "daily",
  "endless",
  "silhouette",
  "choice",
];

export const PICTURE_MODES: PictureMode[] = [
  ...PICTURE_ROUND_MODES,
  "timeattack",
];

/** The ways to play under the header's Endless button. */
export type PictureStyle = Exclude<PictureMode, "daily">;

export const PICTURE_STYLES: PictureStyle[] = [
  "endless",
  "silhouette",
  "choice",
  "timeattack",
];

export function isPictureStyle(value: unknown): value is PictureStyle {
  return PICTURE_STYLES.includes(value as PictureStyle);
}

/** Each kind and mode keeps its own rounds: "halo-daily", "weapon-choice". */
export type PictureSlot = `${PictureKind}-${PictureMode}`;

export const PICTURE_SLOTS: PictureSlot[] = PICTURE_KINDS.flatMap((kind) =>
  PICTURE_MODES.map((mode): PictureSlot => `${kind}-${mode}`)
);

/**
 * One halo or weapon to name. The answer is the student who stands for the
 * picture (see guessPictures.ts); naming any student it belongs to is right,
 * and is saved as the answer.
 */
export interface PictureRound extends NamedRound {
  /** A time attack run of silhouettes. */
  shape?: true;
}
