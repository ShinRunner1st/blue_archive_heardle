import { describe, expect, it } from "vitest";

import type { Drift } from "../constants/cosmetics";
import { driftLayout } from "./drift";

const PETALS: Drift = {
  shape: "petal",
  way: "fall",
  count: 8,
  seconds: 8,
  size: 6,
  colors: ["#FFD1E3", "#FFB3D1"],
};

describe("driftLayout", () => {
  it("is the same for the same cosmetic, on every page", () => {
    const first = driftLayout(PETALS, PETALS.colors, "background:cherry");
    expect(driftLayout(PETALS, PETALS.colors, "background:cherry")).toEqual(
      first
    );
    expect(driftLayout(PETALS, PETALS.colors, "background:lodge")).not.toEqual(
      first
    );
  });

  it("spreads them across, mid-way through, each colour in turn", () => {
    const motes = driftLayout(PETALS, PETALS.colors, "banner:sakura");
    expect(motes).toHaveLength(8);
    motes.forEach((mote, i) => {
      // One in each eighth across, so none bunch up.
      expect(mote.x).toBeGreaterThanOrEqual((i / 8) * 100);
      expect(mote.x).toBeLessThan(((i + 1) / 8) * 100);
      expect(mote.delay).toBeLessThanOrEqual(0);
      expect(-mote.delay).toBeLessThan(mote.seconds);
      expect(mote.color).toBe(PETALS.colors[i % 2]);
    });
  });

  it("keeps a frame's to its edge, clear of the card's words", () => {
    const sides = driftLayout(PETALS, ["#FFFFFF"], "frame:sakura", true);
    for (const { x } of sides) expect(x < 9 || x > 91).toBe(true);

    const stars = driftLayout(
      { ...PETALS, shape: "star", way: "twinkle" },
      ["#FFFFFF"],
      "frame:halo",
      true
    );
    for (const { x, y } of stars) {
      const nearEdge = [x, y, 100 - x, 100 - y].some((d) => d <= 3.01);
      expect(nearEdge).toBe(true);
    }
  });
});
