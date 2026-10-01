import { beforeEach, describe, expect, it } from "vitest";

import {
  CARD_FRAMES,
  CARD_TITLES,
  CURSOR_COLORS,
} from "../constants/cosmetics";
import { MISSIONS } from "../constants/missions";
import {
  BLUE_PALETTE,
  cardFrame,
  cardTitle,
  getCursorColor,
  isUnlocked,
  nextCursorPalette,
  paletteOfHue,
  resetCursorColor,
  setCardFrame,
  setCardTitle,
  setCursorColor,
} from "./cosmetics";
import { saveClearedMissions } from "./missions";

beforeEach(() => {
  localStorage.clear();
  resetCursorColor();
});

describe("cosmetics", () => {
  it("unlocks each with a mission that exists, the defaults with none", () => {
    const missions = new Set(MISSIONS.map(({ id }) => id));
    for (const list of [CARD_TITLES, CARD_FRAMES, CURSOR_COLORS]) {
      expect(list[0].mission).toBeUndefined();
      for (const item of list.slice(1)) {
        expect(missions.has(item.mission!), item.id).toBe(true);
      }
    }
  });

  it("starts everyone on the defaults", () => {
    expect(cardTitle().id).toBe("none");
    expect(cardFrame().id).toBe("schale");
    expect(getCursorColor().id).toBe("blue");
    expect(nextCursorPalette()).toEqual(BLUE_PALETTE);
  });

  it("can't pick one whose mission isn't cleared", () => {
    setCardTitle("dj");
    expect(cardTitle().id).toBe("none");
    expect(isUnlocked(CARD_TITLES[3])).toBe(false);
  });

  it("picks one once its mission is cleared", () => {
    saveClearedMissions(["ost-all", "daily-30", "room-10"]);
    setCardTitle("dj");
    setCardFrame("gold");
    setCursorColor("rainbow");
    expect(cardTitle().name).toBe("Kivotos DJ");
    expect(cardFrame().id).toBe("gold");
    expect(nextCursorPalette()).not.toEqual(nextCursorPalette());
  });

  it("falls back to the default if a save file takes the mission away", () => {
    saveClearedMissions(["daily-30"]);
    setCardFrame("gold");
    saveClearedMissions([]);
    expect(cardFrame().id).toBe("schale");
  });

  it("makes a palette in a hue as bright as the blue", () => {
    const pink = paletteOfHue(330);
    expect(pink.flash).toMatch(/^#[0-9a-f]{6}$/);
    expect(pink.mid).not.toBe(pink.glow);
    expect(paletteOfHue(0).glow).toBe("#ff0000");
  });
});
