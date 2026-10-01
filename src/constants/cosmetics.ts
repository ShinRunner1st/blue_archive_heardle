import cosmeticData from "../content/cosmetics.json";

/**
 * What missions unlock, from src/content/cosmetics.json, each a setting the player picks once it's theirs:
 * a title and a frame for the Sensei card, and a colour for the cursor's
 * effects. All drawn in code, so none adds a file to host. An entry with no
 * mission is everyone's from the start.
 */
interface Cosmetic {
  id: string;
  name: string;
  /** The mission that unlocks it (missions.ts); none for the default. */
  mission?: string;
}

/** A title under the name on the Sensei card. */
export type CardTitle = Cosmetic;

export const CARD_TITLES = cosmeticData.titles as CardTitle[];

/** The Sensei card's colours. */
export interface CardFrame extends Cosmetic {
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

export const CARD_FRAMES = cosmeticData.frames as CardFrame[];

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
