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
}

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
  /** A hue, 0-360; none for the game's own blue or the rainbow. */
  hue?: number;
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

export const BANNERS = cosmeticData.banners as Banner[];

/**
 * How a frame is drawn, each in code (ProfileFrame): a line; filigree,
 * petals or a halo on the corners; a neon glow; a prism of colours. A new
 * one needs drawing there; a new frame of a kind there is only an entry.
 */
export const FRAME_KINDS = [
  "line",
  "filigree",
  "petals",
  "halo",
  "neon",
  "prism",
] as const;
export type FrameKind = (typeof FRAME_KINDS)[number];

export interface Frame extends Cosmetic {
  kind: FrameKind;
  /** The kind's colours: the line first, then its ornaments or glow. */
  colors: string[];
}

export const FRAMES = cosmeticData.frames as Frame[];

/** A scene behind the profile and its card: a picture on the Worker. */
export interface ProfileBackground extends Cosmetic {
  picture?: string;
}

export const BACKGROUNDS = cosmeticData.backgrounds as ProfileBackground[];
