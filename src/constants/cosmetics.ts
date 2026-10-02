import cosmeticData from "../content/cosmetics.json";
import type { CharacterChoice } from "../types/character";

/**
 * What missions unlock, from src/content/cosmetics.json, each a setting the
 * player picks once it's theirs: a title and colours for the Sensei card, a
 * colour for the cursor's effects, a character, and the profile's banner,
 * frame and background. Drawn in code, or pictures already on the Worker,
 * so none adds a file to host. An entry with no mission is everyone's from
 * the start.
 */
export interface Cosmetic {
  id: string;
  name: string;
  /** The mission that unlocks it (missions.ts); none for the default. */
  mission?: string;
  /**
   * Retired missions that unlocked it before `mission` did: whoever cleared
   * one keeps it (helpers/unlocks.ts).
   */
  formerMissions?: string[];
  /**
   * No longer offered to anyone new, never deleted: still worn, and still
   * listed, by whoever has it (docs/accounts.md, section 4).
   */
  retired?: boolean;
  /** Everyone's from the start, though not the default: no mission. */
  free?: boolean;
  /**
   * Shows nothing: the default title and banner, so a card starts with
   * the name alone.
   */
  blank?: boolean;
}

/** A title's words on a card: none for the blank one. */
export const titleText = (title: Cosmetic) => (title.blank ? "" : title.name);

/** A title under the name on the Sensei card. */
export type CardTitle = Cosmetic;

export const CARD_TITLES = cosmeticData.titles as CardTitle[];

/** The Sensei card's colours. */
export interface CardColors extends Cosmetic {
  /** The band across the top, left to right. */
  band: [string, string];
  /** The card itself, top to bottom. */
  body: [string, string];
  /** Names and numbers. */
  ink: string;
  /** Labels and the footer. */
  muted: string;
  /** The address, the title and the tiles' tint. */
  accent: string;
}

export const CARD_COLORS = cosmeticData.cardColors as CardColors[];

/**
 * A colour for the cursor's tap and drag effects: its hue, or the game's
 * own blue, or every colour in turn.
 */
export interface CursorColor extends Cosmetic {
  /** A hue, 0-360; none for the game's own blue or a rainbow. */
  hue?: number;
  /** Every colour in turn, a new hue with each tap or drag. */
  rainbow?: boolean;
  /** A swatch for the picker. */
  swatch: string;
}

export const CURSOR_COLORS = cosmeticData.cursorColors as CursorColor[];

/**
 * The characters to pick in Settings, besides turning her off: Arona and
 * Plana together ("auto") and Mari for everyone, the others unlocked. Each
 * also needs her sprite and set-up in src/constants/characters.ts.
 */
export interface CharacterOption extends Cosmetic {
  id: Exclude<CharacterChoice, "off">;
}

export const CHARACTER_CHOICES = cosmeticData.characters as CharacterOption[];

/**
 * The strip the player's title sits on, on the profile and its card: a
 * picture from the Worker (pictureFiles.ts) under a tint, or a foil of
 * colours, with an emblem (an icon from icons.ts) at its head.
 */
export interface Banner extends Cosmetic {
  picture?: string;
  /** A gradient's colours, left to right, where there's no picture. */
  fill?: string[];
  /** The picture's tint, under the title. */
  tint?: string;
  /** The title. */
  ink: string;
  /** The emblem's ring and the stripes at the end. */
  accent: string;
  emblem: string;
}

/** A blank banner has no look of its own: ProfileBanner draws none. */
export const BANNERS = cosmeticData.banners as unknown as Banner[];

/*
 * A frame is drawn from parts, all data (ProfileFrame), so a new style is
 * only an entry: a border, a thin line inside it, glows outside, and an
 * ornament on the corners. Every colour in a part is a place in the
 * frame's `colors`, so recolouring a style is changing its palette.
 */

/** A colour of the frame's palette, by its place in `colors`. */
export type FrameColor = number;

export const FRAME_GRADIENTS = ["linear", "conic"] as const;

export interface FrameBorder {
  /** Its width, in px. */
  width: number;
  /** One colour for a plain line; more for a gradient round it. */
  colors: FrameColor[];
  /**
   * How a gradient runs: straight across at `angle`, or round the card
   * starting from it.
   */
  gradient?: (typeof FRAME_GRADIENTS)[number];
  /** In degrees. */
  angle?: number;
}

/** A thin line inside the border, the page's colour between them. */
export interface FrameInnerLine {
  gap: number;
  width: number;
  color: FrameColor;
  /** How strong the colour is, 0 to 1. */
  strength: number;
}

/** A glow, or a hard ring with no blur, round the outside. */
export interface FrameGlow {
  blur: number;
  spread: number;
  color: FrameColor;
  strength: number;
}

export const ORNAMENT_SHAPES = ["path", "circle", "ellipse"] as const;
export type OrnamentShapeKind = (typeof ORNAMENT_SHAPES)[number];

/**
 * One SVG shape of an ornament, in a 24×24 box drawn for the top-left
 * corner (the others are it turned): a path's `d`, a circle's `cx`, `cy`
 * and `r`, or an ellipse's `cx`, `cy`, `rx` and `ry`, filled, outlined or
 * both. `at` moves it, turns it and sizes it, as [x, y, degrees] or
 * [x, y, degrees, size], size 1 as drawn.
 */
export interface OrnamentShape {
  shape: OrnamentShapeKind;
  d?: string;
  cx?: number;
  cy?: number;
  r?: number;
  rx?: number;
  ry?: number;
  fill?: FrameColor;
  stroke?: FrameColor;
  strokeWidth?: number;
  at?: [number, number, number] | [number, number, number, number];
}

export const FRAME_CORNERS = ["tl", "tr", "br", "bl"] as const;
export type FrameCorner = (typeof FRAME_CORNERS)[number];

export interface FrameOrnament {
  /** The corners it sits on: a halo floats on two, filigree fences four. */
  corners: FrameCorner[];
  shapes: OrnamentShape[];
}

export interface Frame extends Cosmetic {
  /** The palette its parts take their colours from. */
  colors: string[];
  border: FrameBorder;
  inner?: FrameInnerLine;
  glows?: FrameGlow[];
  ornament?: FrameOrnament;
}

export const FRAMES = cosmeticData.frames as unknown as Frame[];

/** A scene behind the profile and its card: a picture on the Worker. */
export interface ProfileBackground extends Cosmetic {
  picture?: string;
}

export const BACKGROUNDS = cosmeticData.backgrounds as ProfileBackground[];
