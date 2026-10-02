import { beforeEach, describe, expect, it } from "vitest";

import {
  CARD_COLORS,
  CARD_TITLES,
  CURSOR_COLORS,
} from "../constants/cosmetics";
import { MISSIONS } from "../constants/missions";
import {
  BLUE_PALETTE,
  cardColors,
  cardTitle,
  getCursorColor,
  isUnlocked,
  nextCursorPalette,
  paletteOfHue,
  resetCursorColor,
  setCardColors,
  setCardTitle,
  setCursorColor,
  unlocksOf,
} from "./cosmetics";
import cosmeticData from "../content/cosmetics.json";
import type { CosmeticsFile } from "../content/types";
import { saveClearedMissions, setGuestView } from "./missions";

// A signed-in player, who can unlock everything; guests are in missions.test.
beforeEach(() => {
  localStorage.clear();
  resetCursorColor();
  setGuestView(false);
});

describe("cosmetics", () => {
  it("unlocks each with a mission that exists, the defaults with none", () => {
    const missions = new Set(MISSIONS.map(({ id }) => id));
    for (const list of [CARD_TITLES, CARD_COLORS, CURSOR_COLORS]) {
      expect(list[0].mission).toBeUndefined();
      for (const item of list.slice(1)) {
        expect(missions.has(item.mission!), item.id).toBe(true);
      }
    }
  });

  it("starts everyone on the defaults", () => {
    expect(cardTitle().id).toBe("none");
    expect(cardColors().id).toBe("schale");
    expect(getCursorColor().id).toBe("blue");
    expect(nextCursorPalette()).toEqual(BLUE_PALETTE);
  });

  it("can't pick one whose mission isn't cleared", () => {
    setCardTitle("dj");
    expect(cardTitle().id).toBe("none");
    expect(isUnlocked(CARD_TITLES[3])).toBe(false);
  });

  it("picks one once its mission is cleared", () => {
    saveClearedMissions(["ost-timeattack-35", "daily-30", "room-25"]);
    setCardTitle("dj");
    setCardColors("gold");
    setCursorColor("rainbow");
    expect(cardTitle().name).toBe("Kivotos DJ");
    expect(cardColors().id).toBe("gold");
    expect(nextCursorPalette()).not.toEqual(nextCursorPalette());
  });

  it("falls back to the default if a save file takes the mission away", () => {
    saveClearedMissions(["daily-30"]);
    setCardColors("gold");
    saveClearedMissions([]);
    expect(cardColors().id).toBe("schale");
  });

  it("makes a palette in a hue as bright as the blue", () => {
    const pink = paletteOfHue(330);
    expect(pink.flash).toMatch(/^#[0-9a-f]{6}$/);
    expect(pink.mid).not.toBe(pink.glow);
    expect(paletteOfHue(0).glow).toBe("#ff0000");
  });
});

describe("what a mission unlocks", () => {
  /** The game's rewards with Aris moved from one mission to another. */
  function moved(): CosmeticsFile {
    const draft = structuredClone(cosmeticData) as unknown as CosmeticsFile;
    const aris = draft.characters.find(({ id }) => id === "aris")!;
    Object.assign(aris, {
      mission: "room-win-25",
      formerMissions: ["room-first"],
    });
    return draft;
  }

  it("names one reward a mission gives", () => {
    expect(unlocksOf("room-first")).toEqual(["Background: Arcade"]);
    expect(unlocksOf("voice-first-try")).toEqual(["Cursor colour: Violet"]);
  });

  it("names what a live mission gives now, not what moved off it", () => {
    expect(unlocksOf("room-first", moved())).toEqual(["Background: Arcade"]);
    expect(unlocksOf("room-win-25", moved())).toEqual(["Character: Aris"]);
  });

  it("names everything a retired one gave", () => {
    expect(unlocksOf("room-first", moved(), true)).toEqual([
      "Background: Arcade",
      "Character: Aris",
    ]);
  });
});
