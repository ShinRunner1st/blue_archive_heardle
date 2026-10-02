import { describe, expect, it } from "vitest";

import type { IdsLock } from "../content/types";
import { withoutWithdrawn } from "./lock";

const lock = (missions: string[], withdrawn?: string[]): IdsLock => ({
  missions,
  titles: ["none"],
  cardColors: [],
  cursorColors: [],
  characters: [],
  banners: [],
  frames: [],
  backgrounds: [],
  ...(withdrawn && { withdrawn: { missions: withdrawn } }),
});

describe("the ids released", () => {
  it("leaves out what this branch withdraws, and nothing else", () => {
    const released = lock(["a", "b", "c"]);
    expect(
      withoutWithdrawn(released, lock(["a", "c"], ["b"])).missions
    ).toEqual(["a", "c"]);
    expect(withoutWithdrawn(released, lock(["a"])).missions).toEqual([
      "a",
      "b",
      "c",
    ]);
  });
});
