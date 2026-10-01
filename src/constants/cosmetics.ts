/**
 * What missions unlock, each a setting the player picks once it's theirs:
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

export const CARD_TITLES: CardTitle[] = [
  { id: "none", name: "No title" },
  { id: "dependable", name: "Dependable Sensei", mission: "daily-7" },
  { id: "perfect-pitch", name: "Perfect Pitch", mission: "ost-first-try" },
  { id: "dj", name: "Kivotos DJ", mission: "ost-all" },
  { id: "voice", name: "Voice Archivist", mission: "voice-50" },
  { id: "halo", name: "Halo Scholar", mission: "picture-50" },
  { id: "detective", name: "Detective", mission: "students-quick" },
  { id: "champion", name: "Room Champion", mission: "room-win" },
];

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

export const CARD_FRAMES: CardFrame[] = [
  {
    id: "schale",
    name: "Schale",
    band: ["#128AFA", "#45B8FF"],
    body: ["#FFFFFF", "#E6F0FB"],
    ink: "#2B3A55",
    muted: "#6B7A90",
    accent: "#128AFA",
  },
  {
    id: "sakura",
    name: "Sakura",
    mission: "daily-sweep",
    band: ["#E8457E", "#F8A5C2"],
    body: ["#FFFFFF", "#FDE7EF"],
    ink: "#4A1730",
    muted: "#9A6A80",
    accent: "#E0457B",
  },
  {
    id: "night",
    name: "Night",
    mission: "ost-badges",
    band: ["#26306A", "#4B5FC0"],
    body: ["#2A3156", "#151A30"],
    ink: "#EEF2FF",
    muted: "#A8B3D6",
    accent: "#8FB4FF",
  },
  {
    id: "gold",
    name: "Gold",
    mission: "daily-30",
    band: ["#B98512", "#F5C542"],
    body: ["#FFFDF5", "#F6E7BF"],
    ink: "#3A2A08",
    muted: "#8C7440",
    accent: "#B07D12",
  },
  {
    id: "sky",
    name: "Sky",
    mission: "streak-100",
    band: ["#1FA2E0", "#9BE3FF"],
    body: ["#FFFFFF", "#D6F1FF"],
    ink: "#0E3352",
    muted: "#5C86A3",
    accent: "#1B8FD0",
  },
];

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

export const CURSOR_COLORS: CursorColor[] = [
  { id: "blue", name: "Blue", swatch: "#3D63FF" },
  {
    id: "pink",
    name: "Pink",
    mission: "birthday",
    hue: 330,
    swatch: "#FF4DA0",
  },
  { id: "gold", name: "Gold", mission: "ost-100", hue: 42, swatch: "#FFB31A" },
  {
    id: "green",
    name: "Green",
    mission: "students-100",
    hue: 145,
    swatch: "#2BD46F",
  },
  {
    id: "violet",
    name: "Violet",
    mission: "room-first",
    hue: 268,
    swatch: "#9B5CFF",
  },
  {
    id: "rainbow",
    name: "Rainbow",
    mission: "room-10",
    swatch:
      "linear-gradient(90deg, #ff4d4d, #ffd24d, #4dff88, #4dc3ff, #b84dff)",
  },
];
