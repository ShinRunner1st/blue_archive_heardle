import {
  CARD_FRAMES,
  CARD_TITLES,
  CardFrame,
  CardTitle,
  CURSOR_COLORS,
  CursorColor,
} from "../constants/cosmetics";
import {
  CARD_FRAME_KEY,
  CARD_TITLE_KEY,
  CURSOR_COLOR_KEY,
} from "../constants/game";
import { isMissionCleared, loadClearedMissions } from "./missions";

/** Whether the player may use it: the default, or its mission cleared. */
export function isUnlocked(
  cosmetic: { mission?: string },
  cleared: Iterable<string> = loadClearedMissions()
): boolean {
  if (cosmetic.mission === undefined) return true;
  return new Set(cleared).has(cosmetic.mission);
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
function picked<T extends { id: string; mission?: string }>(
  list: T[],
  key: string
): T {
  const id = read(key);
  const found = list.find((item) => item.id === id);
  return found && isMissionCleared(found.mission) ? found : list[0];
}

function pick<T extends { id: string; mission?: string }>(
  list: T[],
  key: string,
  id: string
): void {
  const found = list.find((item) => item.id === id);
  if (!found || !isMissionCleared(found.mission)) return;
  write(key, id);
  // The effects keep the colour they read; let them read the new one.
  if (key === CURSOR_COLOR_KEY) resetCursorColor();
  listeners.forEach((listener) => listener());
}

export const cardTitle = (): CardTitle => picked(CARD_TITLES, CARD_TITLE_KEY);
export const cardFrame = (): CardFrame => picked(CARD_FRAMES, CARD_FRAME_KEY);

export const setCardTitle = (id: string) =>
  pick(CARD_TITLES, CARD_TITLE_KEY, id);
export const setCardFrame = (id: string) =>
  pick(CARD_FRAMES, CARD_FRAME_KEY, id);
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

/** What clearing a mission unlocks, as the pop-up and the toast name it. */
export function unlocksOf(missionId: string): string[] {
  return [
    ...CARD_TITLES.filter(({ mission }) => mission === missionId).map(
      ({ name }) => `Card title: ${name}`
    ),
    ...CARD_FRAMES.filter(({ mission }) => mission === missionId).map(
      ({ name }) => `Card frame: ${name}`
    ),
    ...CURSOR_COLORS.filter(({ mission }) => mission === missionId).map(
      ({ name }) => `Cursor colour: ${name}`
    ),
  ];
}
