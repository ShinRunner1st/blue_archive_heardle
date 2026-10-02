import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { MISSIONS } from "../constants/missions";
import { BANNERS } from "../constants/cosmetics";
import { offered } from "./cosmetics";
import {
  activeClearedCount,
  missionFacts,
  missionProgress,
  setGuestView,
} from "./missions";
import { unlockedLook } from "./roomLook";
import { isOffered, unlockedBy, unlockedWith } from "./unlocks";

// A signed-in player; guests are in missions.test.
beforeEach(() => setGuestView(false));

describe("unlocks", () => {
  const banner = {
    mission: "new-daily",
    formerMissions: ["old-daily"],
  };

  it("opens with the mission, or one that unlocked it before", () => {
    expect(unlockedBy({}, [])).toBe(true);
    expect(unlockedBy(banner, [])).toBe(false);
    expect(unlockedBy(banner, ["new-daily"])).toBe(true);
    expect(unlockedBy(banner, ["old-daily"])).toBe(true);
    expect(unlockedWith(banner, "old-daily")).toBe(true);
    expect(unlockedWith(banner, "other")).toBe(false);
  });

  it("shows a retired one only to whoever has it", () => {
    const gone = { mission: "old-daily", retired: true };
    expect(isOffered(gone, [])).toBe(false);
    expect(isOffered(gone, ["old-daily"])).toBe(true);
    expect(isOffered({ mission: "x" }, [])).toBe(true);
    const list: Array<{ id: string; mission?: string; retired?: boolean }> = [
      { id: "a" },
      { id: "b", ...gone },
    ];
    expect(offered(list, []).map(({ id }) => id)).toEqual(["a"]);
    expect(offered(list, ["old-daily"]).map(({ id }) => id)).toEqual([
      "a",
      "b",
    ]);
  });
});

describe("a retired mission", () => {
  const mission = MISSIONS.find(({ id }) => id === "first-daily")!;
  afterEach(() => {
    delete mission.retired;
  });

  it("can't be cleared any more, and shows only to whoever cleared it", () => {
    const facts = { ...missionFacts(), dailiesWon: 5 };
    expect(
      missionProgress(facts, []).find((p) => p.mission === mission)?.done
    ).toBe(true);

    mission.retired = true;
    expect(missionProgress(facts, []).some((p) => p.mission === mission)).toBe(
      false
    );
    expect(
      missionProgress(facts, ["first-daily"]).find((p) => p.mission === mission)
    ).toMatchObject({ done: true });
  });

  it("isn't counted against today's total, but what it gave stays", () => {
    expect(activeClearedCount(["first-daily", "daily-7"])).toBe(2);
    mission.retired = true;
    expect(activeClearedCount(["first-daily", "daily-7"])).toBe(1);
    // The cherry blossom background it unlocks is still theirs, in a room
    // pass too.
    expect(
      unlockedLook(
        {
          title: "none",
          banner: BANNERS[0].id,
          frame: "schale",
          background: "cherry",
          nameEffect: "none",
        },
        ["first-daily"]
      ).background
    ).toBe("cherry");
  });
});
