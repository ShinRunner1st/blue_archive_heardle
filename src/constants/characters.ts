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
  look: { loop: string[]; end: string[] };
  /** The pat's animations. */
  stroke: { loop: string[]; end: string[] };
}

export interface SpineCharacter {
  id: "arona" | "plana" | "mari";
  name: string;
  /** Under public/spine/, made by scripts/build-spine.py. */
  skel: string;
  atlas: string;
  /**
   * Where she stands in skeleton units: the middle of her body and the top
   * of her halo. Every character is framed alike from there (see FRAME).
   */
  centerX: number;
  top: number;
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
 * The part of every character shown, in skeleton units, from just above her
 * halo down: one size for all, so they stand at the same scale.
 */
export const FRAME = { width: 1200, height: 1750, headroom: 40 };

/** Her frame in skeleton units: x and y of the bottom-left corner. */
export function frameOf(character: SpineCharacter) {
  return {
    x: character.centerX - FRAME.width / 2,
    y: character.top + FRAME.headroom - FRAME.height,
    width: FRAME.width,
    height: FRAME.height,
  };
}

/**
 * From the game's own character data (see the README). Expression numbers
 * were picked by looking at each one.
 */
export const spineCharacters: Record<SpineCharacter["id"], SpineCharacter> = {
  arona: {
    id: "arona",
    name: "Arona",
    skel: "arona/arona_spr.skel",
    atlas: "arona/arona_spr.atlas",
    centerX: 0,
    top: 1333,
    idle: "Idle_01",
    blink: "Eye_Close_01",
    blinkable: [
      "00",
      "01",
      "02",
      "04",
      "05",
      "06",
      "07",
      "08",
      "09",
      "15",
      "16",
      "19",
      "20",
    ],
    touch: {
      point: "Touch_Point",
      eye: "Touch_Eye",
      pointSetup: [26, 967],
      pat: [0, 1040, 210],
      lookMax: 100,
      patMax: 60,
      look: {
        loop: ["Look_01_M", "Look_01_A"],
        end: ["LookEnd_01_M", "LookEnd_01_A"],
      },
      stroke: {
        loop: ["Pat_01_M", "Pat_01_A"],
        end: ["PatEnd_01_M", "PatEnd_01_A"],
      },
    },
    moods: {
      idle: "00",
      listening: "03",
      wrong: "28",
      nervous: ["01", "04", "20", "15", "29"],
      won: ["21", "12", "11", "32", "09", "03"],
      lost: "10",
      tapped: [
        "02",
        "03",
        "08",
        "09",
        "11",
        "12",
        "16",
        "18",
        "19",
        "21",
        "25",
        "32",
      ],
    },
  },
  plana: {
    id: "plana",
    name: "Plana",
    skel: "plana/NP0035_spr.skel",
    atlas: "plana/NP0035_spr.atlas",
    centerX: -20,
    top: 1368,
    idle: "Idle_01",
    blink: "Eye_Close_01",
    blinkable: [
      "00",
      "01",
      "02",
      "03",
      "04",
      "05",
      "06",
      "07",
      "08",
      "10",
      "11",
      "12",
      "15",
      "18",
      "20",
    ],
    touch: {
      point: "Touch_Point",
      eye: "Touch_Eye",
      pointSetup: [-38, 1014],
      pat: [-15, 1060, 215],
      lookMax: 100,
      patMax: 60,
      look: { loop: ["Look_01_M"], end: ["LookEnd_01_M", "LookEnd_01_A"] },
      stroke: {
        loop: ["Pat_01_M", "Pat_01_A"],
        end: ["PatEnd_01_M", "PatEnd_01_A"],
      },
    },
    moods: {
      idle: "00",
      listening: "17",
      wrong: "05",
      nervous: ["02", "04", "07", "12", "13"],
      won: ["09", "16", "18", "15", "15", "17"],
      lost: "19",
      tapped: ["05", "09", "10", "14", "15", "16", "18", "20"],
    },
  },
  mari: {
    id: "mari",
    name: "Mari",
    skel: "mari/CH0273_spr.skel",
    atlas: "mari/CH0273_spr.atlas",
    centerX: 0,
    top: 1464,
    idle: "Idle_01",
    blink: "Eye_Close_01",
    // Her sprite has one closed-eye face, her default's: a blink swaps her
    // whole face for it, so only on that face does it look right.
    blinkable: ["00"],
    touch: null,
    moods: {
      idle: "00",
      listening: "99",
      wrong: "06",
      nervous: ["16", "02", "04", "05", "08"],
      won: ["10", "03", "03", "13", "13", "01"],
      lost: "09",
      tapped: ["01", "03", "10", "11", "12", "13"],
    },
  },
};
