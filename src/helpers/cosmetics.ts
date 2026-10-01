import {
  BACKGROUNDS,
  BANNERS,
  FRAMES,
  CARD_COLORS,
  CARD_TITLES,
  CHARACTER_CHOICES,
  CardColors,
  CardTitle,
  Cosmetic,
  CURSOR_COLORS,
  CursorColor,
} from "../constants/cosmetics";
import {
  CARD_COLORS_KEY,
  CARD_TITLE_KEY,
  CURSOR_COLOR_KEY,
  PROFILE_BACKGROUND_KEY,
  PROFILE_BANNER_KEY,
  PROFILE_FRAME_KEY,
} from "../constants/game";
import { loadClearedMissions } from "./missions";
import { markProfileEdited } from "./profileEdit";
import { isOffered, Unlockable, unlockedBy, unlockedWith } from "./unlocks";

/** Whether the player may use it: the default, or its mission cleared. */
export function isUnlocked(
  cosmetic: Unlockable,
  cleared: Iterable<string> = loadClearedMissions()
): boolean {
  return unlockedBy(cosmetic, cleared);
}

/**
 * A list's items to show the player: all but the retired ones they don't
 * have, which nobody new can get.
 */
export function offered<T extends Unlockable>(
  list: T[],
  cleared: Iterable<string> = loadClearedMissions()
): T[] {
  const done = [...cleared];
  return list.filter((item) => isOffered(item, done));
}

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage unavailable: the choice lasts until the page closes.
  }
}

const listeners = new Set<() => void>();

export function subscribeCosmetics(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * The player's pick from a list, if it's still theirs (a save file from
 * before its mission wouldn't have it), or the list's first, the default.
 */
function picked<T extends { id: string } & Unlockable>(
  list: T[],
  key: string
): T {
  const id = read(key);
  const found = list.find((item) => item.id === id);
  return found && isUnlocked(found) ? found : list[0];
}

function pick<T extends { id: string } & Unlockable>(
  list: T[],
  key: string,
  id: string
): void {
  const found = list.find((item) => item.id === id);
  if (!found || !isUnlocked(found)) return;
  store(key, id);
}

function store(key: string, id: string): void {
  if (read(key) === id) return;
  write(key, id);
  // The effects keep the colour they read; let them read the new one.
  if (key === CURSOR_COLOR_KEY) resetCursorColor();
  // The cursor's colour is this browser's setting; the rest are the profile.
  else markProfileEdited();
  listeners.forEach((listener) => listener());
}

/**
 * Every kind of cosmetic a player picks from a list and keeps under a key:
 * what Customize and the mission pop-up go through. A new kind is its list
 * in cosmetics.json, an entry here, and how it looks (CosmeticSwatch).
 */
export const COSMETIC_KINDS = {
  title: { label: "Card title", list: CARD_TITLES, key: CARD_TITLE_KEY },
  cardColors: {
    label: "Sensei card colours",
    list: CARD_COLORS,
    key: CARD_COLORS_KEY,
  },
  cursor: {
    label: "Cursor colour",
    list: CURSOR_COLORS,
    key: CURSOR_COLOR_KEY,
  },
  banner: { label: "Banner", list: BANNERS, key: PROFILE_BANNER_KEY },
  frame: { label: "Frame", list: FRAMES, key: PROFILE_FRAME_KEY },
  background: {
    label: "Background",
    list: BACKGROUNDS,
    key: PROFILE_BACKGROUND_KEY,
  },
} satisfies Record<string, { label: string; list: Cosmetic[]; key: string }>;

export type CosmeticKind = keyof typeof COSMETIC_KINDS;
type ItemOf<K extends CosmeticKind> =
  (typeof COSMETIC_KINDS)[K]["list"][number];

/** The player's pick of a kind, or its default. */
export function pickedOf<K extends CosmeticKind>(kind: K): ItemOf<K> {
  const { list, key } = COSMETIC_KINDS[kind];
  return picked(list as ItemOf<K>[], key);
}

/** Picks one, if it's unlocked. */
/**
 * The pick kept for a kind, as stored: possibly one not unlocked here
 * (the account's, before this browser's missions catch up), which
 * pickedOf shows as the default until it is.
 */
export function storedPick(kind: CosmeticKind): string {
  const { list, key } = COSMETIC_KINDS[kind];
  const id = read(key);
  return list.some((item) => item.id === id) ? id! : list[0].id;
}

/**
 * Keeps a pick from the account as it is, unlocked here or not: dropping
 * it would lose it, and pickedOf shows it only once its mission is
 * cleared here too. Picks made on this page go through setPicked.
 */
export function storeAccountPick(kind: CosmeticKind, id: string): void {
  const { list, key } = COSMETIC_KINDS[kind];
  if (list.some((item) => item.id === id)) store(key, id);
}

export function setPicked(kind: CosmeticKind, id: string): void {
  const { list, key } = COSMETIC_KINDS[kind];
  pick(list as Cosmetic[], key, id);
}

export const cardTitle = (): CardTitle => picked(CARD_TITLES, CARD_TITLE_KEY);
export const cardColors = (): CardColors =>
  picked(CARD_COLORS, CARD_COLORS_KEY);

export const setCardTitle = (id: string) =>
  pick(CARD_TITLES, CARD_TITLE_KEY, id);
export const setCardColors = (id: string) =>
  pick(CARD_COLORS, CARD_COLORS_KEY, id);
export const setCursorColor = (id: string) =>
  pick(CURSOR_COLORS, CURSOR_COLOR_KEY, id);

/** Read once, then kept: the effects ask on every tap. */
let cursorColor: CursorColor | null = null;

export function getCursorColor(): CursorColor {
  if (!cursorColor) cursorColor = picked(CURSOR_COLORS, CURSOR_COLOR_KEY);
  return cursorColor;
}

/** Forgets the cached colour, for tests and after a save file is read. */
export function resetCursorColor(): void {
  cursorColor = null;
}

/** The cursor effects' colours, as the game's own blue names them. */
export interface CursorPalette {
  /** The tap's disc. */
  flash: string;
  /** Its two rings. */
  ring: string;
  /** The triangles. */
  shard: string;
  /** The trail's glow at its head, and its halo. */
  glow: string;
  /** The trail's glow halfway along, on its way to black. */
  mid: string;
  /** The trail's bright core. */
  core: string;
}

/** The game's own, measured from its footage (see cursorEffects.ts). */
export const BLUE_PALETTE: CursorPalette = {
  flash: "#3D63FF",
  ring: "#4DA6FF",
  shard: "#5EC4FF",
  glow: "#0063FF",
  mid: "#001747",
  core: "#5EE4FF",
};

/** HSL to #rrggbb, for a palette made from a hue. */
function hsl(h: number, s: number, l: number): string {
  const k = (n: number) => (n + h / 30) % 12;
  const a = (s / 100) * Math.min(l / 100, 1 - l / 100);
  const f = (n: number) =>
    l / 100 - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return `#${[0, 8, 4]
    .map((n) =>
      Math.round(f(n) * 255)
        .toString(16)
        .padStart(2, "0")
    )
    .join("")}`;
}

/**
 * The blue palette's shape in another hue: as bright and as saturated, so
 * the effect reads the same, only coloured.
 */
export function paletteOfHue(hue: number): CursorPalette {
  return {
    flash: hsl(hue, 100, 62),
    ring: hsl(hue + 8, 100, 65),
    shard: hsl(hue + 14, 100, 68),
    glow: hsl(hue, 100, 50),
    mid: hsl(hue, 100, 14),
    core: hsl(hue + 18, 100, 68),
  };
}

/** How far round the colour wheel the rainbow moves with each tap or drag. */
const RAINBOW_STEP = 47;
let rainbowHue = 0;

/**
 * The colours for the next tap or trail: the picked colour's, or with the
 * rainbow, the next hue round the wheel, so taps in a row differ.
 */
export function nextCursorPalette(): CursorPalette {
  const color = getCursorColor();
  if (color.id === "rainbow") {
    rainbowHue = (rainbowHue + RAINBOW_STEP) % 360;
    return paletteOfHue(rainbowHue);
  }
  return color.hue === undefined ? BLUE_PALETTE : paletteOfHue(color.hue);
}

/**
 * What clearing a mission unlocks, as the pop-up and the toast name it: a
 * retired mission's too, as whoever cleared it keeps them.
 */
export function unlocksOf(missionId: string): string[] {
  return [
    ...Object.values(COSMETIC_KINDS).flatMap(({ label, list }) =>
      (list as Cosmetic[])
        .filter((item) => unlockedWith(item, missionId))
        .map(({ name }) => `${label}: ${name}`)
    ),
    ...CHARACTER_CHOICES.filter((item) => unlockedWith(item, missionId)).map(
      ({ name }) => `Character: ${name}`
    ),
  ];
}
