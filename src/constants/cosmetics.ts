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

/*
 * Moving parts, shared by banners, frames and backgrounds: things drifting
 * over them, each a few spans the browser moves by itself (transforms and
 * fades only), placed the same way on every page from the cosmetic's id.
 */

/** What drifts: petals, snow, sparks, stars, leaves or bubbles. */
export const DRIFT_SHAPES = [
  "petal",
  "snow",
  "spark",
  "star",
  "leaf",
  "bubble",
] as const;
export type DriftShape = (typeof DRIFT_SHAPES)[number];

/** How they move: falling across, rising, or twinkling where they are. */
export const DRIFT_WAYS = ["fall", "rise", "twinkle"] as const;
export type DriftWay = (typeof DRIFT_WAYS)[number];

/**
 * Things drifting over a cosmetic. Its colours are hex on a banner or a
 * background, and places in the palette on a frame, as a frame's are.
 */
export interface Drift<C = string> {
  shape: DriftShape;
  way: DriftWay;
  /** How many at once. */
  count: number;
  /** Seconds for one to cross, or to twinkle once. */
  seconds: number;
  /** Each one's size, in px. */
  size: number;
  /** Each takes one in turn. */
  colors: C[];
}

/** The most a cosmetic has drifting, so eight cards in a room stay light. */
export const MAX_DRIFT = 24;

/** The patterns a nameplate can have over it, like the game's own plates. */
export const BANNER_PATTERNS = ["facets", "grid", "lines"] as const;
export type BannerPattern = (typeof BANNER_PATTERNS)[number];

/**
 * How an emblem sits on its plate: in a ring at the head, standing free as
 * a crest, or as a picture down the left side, cut on a slant, as the
 * game's plates show a student.
 */
export const EMBLEM_STYLES = ["ring", "crest", "side"] as const;
export type EmblemStyle = (typeof EMBLEM_STYLES)[number];

/**
 * A nameplate's emblem: an icon from icons.ts, or shapes drawn in a 24×24
 * box as a frame's ornament is (pictures among them), their colours from
 * its own palette; a side emblem is one picture.
 */
export interface BannerEmblem {
  style: EmblemStyle;
  icon?: string;
  shapes?: OrnamentShape[];
  /** The palette the shapes take their colours from. */
  colors?: string[];
  /** A side emblem's picture, on the Worker (pictureFiles.ts). */
  picture?: string;
  /**
   * A side picture cut on a slant with a line of the rim along it, for a
   * photo; without, it shows as drawn, as the game's cut-out faces are.
   */
  cut?: boolean;
}

/**
 * The player's title on a nameplate, like the game's own emblems (its user
 * titles): a plate of a picture from the Worker or a foil of colours, a
 * pattern over it, a rim, the title on a soft band, an emblem and a small
 * tag. Drawn by ProfileBanner.
 */
export interface Banner extends Cosmetic {
  picture?: string;
  /** A gradient's colours, left to right, where there's no picture. */
  fill?: string[];
  pattern?: BannerPattern;
  /** A soft band behind the title, so its words read over a picture. */
  band?: string;
  /** The title. */
  ink: string;
  /** The plate's rim, and an emblem's ring. */
  accent: string;
  emblem?: BannerEmblem;
  /** A few words in a pill at its foot, such as "30 DAYS". */
  tag?: string;
  /** A light sweeping across the plate now and then, as over foil. */
  shine?: BannerShine;
  /** Seconds for its picture to pan slowly across and back. */
  pan?: number;
  drift?: Drift;
}

export interface BannerShine {
  color: string;
  /** Seconds from one sweep to the next. */
  seconds: number;
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
  /** Seconds for a gradient to turn once round. */
  spin?: number;
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

export const ORNAMENT_SHAPES = [
  "path",
  "circle",
  "ellipse",
  "picture",
] as const;
export type OrnamentShapeKind = (typeof ORNAMENT_SHAPES)[number];

/**
 * One SVG shape of an ornament or emblem, in a 24×24 box (an ornament's
 * drawn for the top-left corner, the others getting it turned): a path's
 * `d`, a circle's `cx`, `cy` and `r`, or an ellipse's `cx`, `cy`, `rx` and
 * `ry`, filled, outlined or both; or a picture, a square `r` from its
 * middle at `cx`, `cy`. `at` moves it, turns it and sizes it, as
 * [x, y, degrees] or [x, y, degrees, size], size 1 as drawn.
 */
export interface OrnamentShape {
  shape: OrnamentShapeKind;
  /** A picture's, on the Worker (pictureFiles.ts): "emblems/crest". */
  picture?: string;
  d?: string;
  cx?: number;
  cy?: number;
  r?: number;
  rx?: number;
  ry?: number;
  fill?: FrameColor;
  stroke?: FrameColor;
  strokeWidth?: number;
  /** Fills by the even-odd rule, so a shape inside another cuts a hole. */
  evenOdd?: boolean;
  at?: [number, number, number] | [number, number, number, number];
}

export const FRAME_CORNERS = ["tl", "tr", "br", "bl"] as const;
export type FrameCorner = (typeof FRAME_CORNERS)[number];

export interface FrameOrnament {
  /** The corners it sits on: a halo floats on two, filigree fences four. */
  corners: FrameCorner[];
  shapes: OrnamentShape[];
  /**
   * Corners with an ornament of their own, in place of the shared one:
   * drawn as they show there, not turned.
   */
  own?: Partial<Record<FrameCorner, OrnamentShape[]>>;
}

/** The shapes on a frame's corner, and whether they're turned to it. */
export function cornerShapes(
  ornament: FrameOrnament | undefined,
  corner: FrameCorner
): { shapes: OrnamentShape[]; turned: boolean } | null {
  const own = ornament?.own?.[corner];
  if (own) return { shapes: own, turned: false };
  if (ornament?.corners.includes(corner)) {
    return { shapes: ornament.shapes, turned: true };
  }
  return null;
}

export interface Frame extends Cosmetic {
  /** The palette its parts take their colours from. */
  colors: string[];
  border: FrameBorder;
  inner?: FrameInnerLine;
  glows?: FrameGlow[];
  /** The glows growing and fading, as a breath. */
  pulse?: FramePulse;
  ornament?: FrameOrnament;
  /** Things drifting or twinkling round its edge. */
  drift?: Drift<FrameColor>;
}

export interface FramePulse {
  /** Seconds for one breath. */
  seconds: number;
  /** How strong the glows are at their faintest, 0 to 1 of their own. */
  low: number;
}

export const FRAMES = cosmeticData.frames as unknown as Frame[];

/** A scene behind the profile and its card: a picture on the Worker. */
export interface ProfileBackground extends Cosmetic {
  picture?: string;
  /** Things drifting over the scene: petals, snow, sparks. */
  drift?: Drift;
}

export const BACKGROUNDS = cosmeticData.backgrounds as ProfileBackground[];

/** How a name's letters move: their colours flowing, a light, a breath. */
export const NAME_MOTIONS = ["flow", "shine", "pulse", "flicker"] as const;
export type NameMotion = (typeof NAME_MOTIONS)[number];

export interface NameMotionPart {
  kind: NameMotion;
  /** Seconds for one round of it. */
  seconds: number;
  /** A shine's light, from the palette; white with none. */
  color?: FrameColor;
}

/**
 * How the player's name is drawn on their card, in rooms too: its letters'
 * colours (one, or a gradient across), a glow, and a motion. Colours are
 * places in its palette, as a frame's are. Drawn by NameInk.
 */
export interface NameEffect extends Cosmetic {
  colors: string[];
  /** The letters' colours, left to right; the page's own with none. */
  fill?: FrameColor[];
  /** A gradient's angle, in degrees. */
  angle?: number;
  glow?: { color: FrameColor; blur: number; strength: number };
  motion?: NameMotionPart;
}

/** The first is plain: the name as it ever was. */
export const NAME_EFFECTS = cosmeticData.nameEffects as unknown as NameEffect[];
