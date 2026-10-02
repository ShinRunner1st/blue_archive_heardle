import characterData from "../content/characters.json";
import { Moods } from "../helpers/characterMood";

/** Head-touch set-up for characters whose skeleton has the touch bones. */
export interface Touch {
  /** Bones that head, hair, halo and eyes follow. */
  point: string;
  eye: string;
  /** Where Touch_Point sits in the setup pose (skeleton units). */
  pointSetup: [number, number];
  /**
   * A press inside this circle (x, y, radius in skeleton units) is a pat. It
   * takes in the hair and the top of the head, where a pat lands.
   */
  pat: [number, number, number];
  /** Furthest the look and the pat may move Touch_Point. */
  lookMax: number;
  patMax: number;
  /**
   * How much of a look's offset Touch_Eye takes. All of it sent her eyes
   * much further than her head turned.
   */
  lookEyes: number;
  look: { loop: string[]; end: string[] };
  /** The pat's animations. */
  stroke: { loop: string[]; end: string[] };
}

/**
 * A character with a sprite in public/spine/, by her id in
 * src/content/characters.json: data, so the admin tool can add one.
 */
export type CharacterId = string;

export interface SpineCharacter {
  id: CharacterId;
  name: string;
  /** Why her faces were picked as they were, for whoever edits them. */
  note?: string;
  /** Under public/spine/, made by scripts/build-spine.py. */
  skel: string;
  atlas: string;
  /**
   * Where she stands in skeleton units: the middle of her body and the
   * height of her eyes. Every character is framed alike from there (see
   * FRAME), so all their faces sit at the same place on screen.
   */
  centerX: number;
  eyes: number;
  idle: string;
  blink: string | null;
  /**
   * Expressions with her ordinary open eyes, the only ones a blink suits: on
   * any other (closed, sparkling, shocked...) it would leave plain open eyes
   * behind.
   */
  blinkable: string[];
  /** Absent for a sprite without touch bones, which can only be tapped. */
  touch: Touch | null;
  moods: Moods;
}

/**
 * How every character is framed, in skeleton units: at least this much of
 * her fits across and down the space beside the game, whichever is tighter,
 * with the top of the view this far above her eyes. One scale for all, and
 * every face at the same height; below, she runs on behind the footer.
 *
 * Where the width is what limits her, the view is taller than that, and
 * would leave her feet short of the footer. The view then never reaches
 * further than `belowEyes` under the eyes - just past Arona's feet, the
 * shortest - and the extra goes above her instead, the same for everyone.
 */
export const FRAME = {
  width: 1400,
  height: 1990,
  aboveEyes: 560,
  belowEyes: 1609,
};

/**
 * The characters, from src/content/characters.json (the game's own
 * character data, see the README): where each stands, her faces for each
 * moment of a round, and her touch bones if she has them. Expression
 * numbers were picked by looking at each one; the admin tool shows them.
 */
export const spineCharacters: Record<CharacterId, SpineCharacter> =
  Object.fromEntries(
    (characterData as SpineCharacter[]).map((character) => [
      character.id,
      character,
    ])
  );
