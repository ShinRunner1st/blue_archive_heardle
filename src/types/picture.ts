import { PICTURE_KINDS, PictureKind } from "../constants/guessSheets";

import { NamedRound } from "./voice";

export { PICTURE_KINDS };
export type { PictureKind };

export function isPictureKind(value: unknown): value is PictureKind {
  return PICTURE_KINDS.includes(value as PictureKind);
}

/**
 * The picture game's ways to play, for each kind, halo or weapon: daily;
 * Classic, with hints or none, the picture or its silhouette; 4-Choice, the
 * picture or its silhouette; and time attack. Each keeps its own rounds,
 * stats and streak, as Voice mode's No hints does.
 */
export type PictureMode =
  | "daily"
  | "endless"
  | "nohint"
  | "silhouette"
  | "silhouette-nohint"
  | "choice"
  | "choice-silhouette"
  | "timeattack";

/** The modes played one round at a time, which usePictureGame runs. */
export type PictureRoundMode = Exclude<PictureMode, "timeattack">;

export const PICTURE_ROUND_MODES: PictureRoundMode[] = [
  "daily",
  "endless",
  "nohint",
  "silhouette",
  "silhouette-nohint",
  "choice",
  "choice-silhouette",
];

export const PICTURE_MODES: PictureMode[] = [
  ...PICTURE_ROUND_MODES,
  "timeattack",
];

/** The ways to play under the header's Endless button. */
export type PictureStyle = Exclude<PictureMode, "daily">;

export const PICTURE_STYLES: PictureStyle[] = PICTURE_MODES.filter(
  (mode): mode is PictureStyle => mode !== "daily"
);

export function isPictureStyle(value: unknown): value is PictureStyle {
  return PICTURE_STYLES.includes(value as PictureStyle);
}

/** The switch's three pills, which the ways to play group under. */
export type PicturePill = "endless" | "choice" | "timeattack";

/** What the rows above the game pick: the picture's shape, and hints. */
export interface PictureOptions {
  shape: boolean;
  hints: boolean;
}

/** Which pill a way to play sits under: Classic, 4-Choice or Time Attack. */
export function pillOf(style: PictureStyle): PicturePill {
  if (style === "timeattack") return "timeattack";
  return style.startsWith("choice") ? "choice" : "endless";
}

/** A way to play's options. Time attack picks its shape on its own screen. */
export function optionsOf(mode: PictureMode): PictureOptions {
  return {
    shape: mode.includes("silhouette"),
    hints: mode === "daily" || mode === "endless" || mode === "silhouette",
  };
}

/** The way to play for a pill and options; 4-Choice has no hints to pick. */
export function styleFor(
  pill: PicturePill,
  { shape, hints }: PictureOptions
): PictureStyle {
  if (pill === "timeattack") return "timeattack";
  if (pill === "choice") return shape ? "choice-silhouette" : "choice";
  if (shape) return hints ? "silhouette" : "silhouette-nohint";
  return hints ? "endless" : "nohint";
}

/**
 * Each kind and mode keeps its own rounds: "halo-daily", "weapon-choice".
 * The kind has no dash, so the slot splits at its first.
 */
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
