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

/** Every character with a sprite in public/spine/. */
export type CharacterId =
  | "arona"
  | "plana"
  | "mari"
  | "shiroko"
  | "hoshino"
  | "hina"
  | "aris";

export interface SpineCharacter {
  id: CharacterId;
  name: string;
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
    eyes: 874,
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
      lookEyes: 0.4,
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
      nervous: ["01", "04", "07", "06", "29"],
      won: ["21", "12", "11", "32", "23", "03"],
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
    eyes: 910,
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
      lookEyes: 0.4,
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
    eyes: 965,
    idle: "Idle_01",
    blink: "Eye_Close_01",
    // Her sprite has one closed-eye face, and a blink swaps her whole face
    // for it: her gentle smile (01) with her eyes shut. Only on that smile
    // does a blink look right.
    blinkable: ["01"],
    touch: null,
    moods: {
      idle: "01",
      listening: "99",
      wrong: "06",
      nervous: ["16", "02", "04", "05", "08"],
      won: ["10", "03", "03", "13", "13", "01"],
      lost: "09",
      tapped: ["00", "03", "10", "11", "12", "13"],
    },
  },
  shiroko: {
    id: "shiroko",
    name: "Shiroko",
    skel: "shiroko/shiroko_spr.skel",
    atlas: "shiroko/shiroko_spr.atlas",
    centerX: 0,
    eyes: 1000,
    idle: "Idle_01",
    blink: "Eye_Close_01",
    // Calm as she is in the game: her faces change a little, so a win is her rare smile (08).
    blinkable: ["00"],
    touch: null,
    moods: {
      idle: "00",
      listening: "99",
      wrong: "06",
      nervous: ["05", "01", "13", "16", "17"],
      won: ["08", "12", "04", "12", "09", "00"],
      lost: "15",
      tapped: ["02", "04", "08", "10", "12", "14"],
    },
  },
  hoshino: {
    id: "hoshino",
    name: "Hoshino",
    skel: "hoshino/hoshino_spr.skel",
    atlas: "hoshino/hoshino_spr.atlas",
    centerX: 0,
    eyes: 920,
    idle: "Idle_01",
    blink: "Eye_Close_01",
    // At rest her calm face (01), the one her blink suits; her sleepy wink
    // (00) is for taps, and she dozes while the clip plays (99).
    blinkable: ["01"],
    touch: null,
    moods: {
      idle: "01",
      listening: "99",
      wrong: "04",
      nervous: ["05", "13", "16", "06", "17"],
      won: ["03", "02", "08", "07", "14", "15"],
      lost: "12",
      tapped: ["00", "02", "07", "09", "10", "11", "14"],
    },
  },
  hina: {
    id: "hina",
    name: "Hina",
    skel: "hina/hina_spr.skel",
    atlas: "hina/hina_spr.atlas",
    centerX: 0,
    eyes: 929,
    idle: "Idle_01",
    blink: "Eye_Close_01",
    // The prefect: stern at rest, a sweat drop as the tries go, her rare smile (08) for a quick win and the gloom (15) for a loss.
    blinkable: ["00"],
    touch: null,
    moods: {
      idle: "00",
      listening: "99",
      wrong: "06",
      nervous: ["04", "12", "05", "20", "13"],
      won: ["08", "16", "17", "18", "02", "01"],
      lost: "15",
      tapped: ["07", "09", "10", "11", "17", "18", "25"],
    },
  },
  aris: {
    id: "aris",
    name: "Aris",
    skel: "aris/aris_spr.skel",
    atlas: "aris/aris_spr.atlas",
    centerX: 0,
    eyes: 968,
    idle: "Idle_01",
    blink: "Eye_Close_01",
    // Only Aris's own faces: the pink-eyed ones (12, 14-19) are Kei's.
    blinkable: ["00"],
    touch: null,
    moods: {
      idle: "00",
      listening: "99",
      wrong: "03",
      nervous: ["01", "02", "05", "06", "09"],
      won: ["07", "08", "00", "010", "11", "00"],
      lost: "10",
      tapped: ["00", "04", "07", "08", "010", "11"],
    },
  },
};
