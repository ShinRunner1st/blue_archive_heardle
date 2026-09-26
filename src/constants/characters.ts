import { Moods } from "../helpers/characterMood";

/** Head-touch set-up for characters whose skeleton has the touch bones. */
export interface Touch {
  /** Bones that head, hair, halo and eyes follow. */
  point: string;
  eye: string;
  /** Where the head and Touch_Point sit in the setup pose (skeleton units). */
  head: [number, number];
  pointSetup: [number, number];
  /** A press within this distance of the head is a pat. */
  headRadius: number;
  /** Furthest the look and the pat may move Touch_Point. */
  lookMax: number;
  patMax: number;
  look: { loop: string[]; end: string[] };
  pat: { loop: string[]; end: string[] };
}

export interface SpineCharacter {
  id: "arona" | "plana" | "mari";
  name: string;
  /** Under public/spine/, made by scripts/build-spine.py. */
  skel: string;
  atlas: string;
  /** The part of the skeleton shown: from the halo down to the knees. */
  frame: { x: number; y: number; width: number; height: number };
  idle: string;
  blink: string | null;
  /** Absent for a sprite without touch bones, which can only be tapped. */
  touch: Touch | null;
  moods: Moods;
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
    frame: { x: -510, y: -300, width: 1011, height: 1640 },
    idle: "Idle_01",
    blink: "Eye_Close_01",
    touch: {
      point: "Touch_Point",
      eye: "Touch_Eye",
      head: [6, 857],
      pointSetup: [26, 967],
      headRadius: 140,
      lookMax: 100,
      patMax: 60,
      look: {
        loop: ["Look_01_M", "Look_01_A"],
        end: ["LookEnd_01_M", "LookEnd_01_A"],
      },
      pat: {
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
    frame: { x: -620, y: -350, width: 1154, height: 1720 },
    idle: "Idle_01",
    blink: "Eye_Close_01",
    touch: {
      point: "Touch_Point",
      eye: "Touch_Eye",
      head: [-11, 890],
      pointSetup: [-38, 1014],
      headRadius: 140,
      lookMax: 100,
      patMax: 60,
      look: { loop: ["Look_01_M"], end: ["LookEnd_01_M", "LookEnd_01_A"] },
      pat: {
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
    frame: { x: -499, y: -600, width: 985, height: 2064 },
    idle: "Idle_01",
    blink: "Eye_Close_01",
    touch: null,
    moods: {
      idle: "01",
      listening: "07",
      wrong: "06",
      nervous: ["16", "02", "04", "05", "08"],
      won: ["10", "00", "00", "03", "03", "13"],
      lost: "09",
      tapped: ["00", "03", "10", "11", "12", "13"],
    },
  },
};
