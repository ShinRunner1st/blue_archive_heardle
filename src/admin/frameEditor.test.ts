import { describe, expect, it } from "vitest";

import type { Frame } from "../constants/cosmetics";
import { frameProblems } from "../content/validate";
import { withoutColor } from "./FrameEditor";
import { ORNAMENT_LIBRARY, placed } from "./ornamentLibrary";

describe("withoutColor", () => {
  it("moves up every part that named a colour after the one taken out", () => {
    const frame: Frame = {
      id: "test",
      name: "Test",
      colors: ["#000000", "#111111", "#222222"],
      border: { width: 2, colors: [0, 2] },
      inner: { gap: 4, width: 1, color: 2, strength: 0.5 },
      glows: [{ blur: 4, spread: 0, color: 0, strength: 1 }],
      ornament: {
        corners: ["tl"],
        shapes: [{ shape: "circle", r: 2, fill: 2, stroke: 0, strokeWidth: 1 }],
      },
    };
    const next = withoutColor(frame, 1);
    expect(next.colors).toEqual(["#000000", "#222222"]);
    expect(next.border?.colors).toEqual([0, 1]);
    expect(next.inner?.color).toBe(1);
    expect(next.glows?.[0].color).toBe(0);
    expect(next.ornament?.shapes[0]).toMatchObject({ fill: 1, stroke: 0 });
  });
});

describe("the ornament library", () => {
  it("makes shapes the content check takes, in any palette", () => {
    for (const colors of [["#FFFFFF"], ["#FFFFFF", "#000000", "#FF0000"]]) {
      const frame: Frame = {
        id: "test",
        name: "Test",
        colors,
        border: { width: 2, colors: [0] },
        ornament: {
          corners: ["tl"],
          shapes: ORNAMENT_LIBRARY.flatMap((item) =>
            placed(item, colors, [11, 11])
          ),
        },
      };
      expect(frameProblems(frame)).toEqual([]);
    }
  });
});
