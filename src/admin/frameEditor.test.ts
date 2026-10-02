import { describe, expect, it } from "vitest";

import type { Frame } from "../constants/cosmetics";
import { shapesFromSvg, withoutColor } from "./FrameEditor";

describe("shapesFromSvg", () => {
  it("takes paths, circles and ellipses, their colours into the palette", () => {
    const made = shapesFromSvg(
      `<svg viewBox="0 0 24 24">
        <path d="M2 2h8" stroke="#f00" stroke-width="2" fill="none"/>
        <circle cx="5" cy="6" r="2" style="fill: #FFFFFF"/>
        <ellipse cx="9" cy="9" rx="3" ry="1"/>
        <rect width="4" height="4"/>
      </svg>`,
      ["#FFFFFF"]
    );
    expect(made.colors).toEqual(["#FFFFFF", "#FF0000"]);
    expect(made.shapes).toEqual([
      { shape: "path", d: "M2 2h8", stroke: 1, strokeWidth: 2 },
      { shape: "circle", cx: 5, cy: 6, r: 2, fill: 0 },
      { shape: "ellipse", cx: 9, cy: 9, rx: 3, ry: 1, fill: 0 },
    ]);
    expect(made.notes).toEqual([]);
  });

  it("says what it couldn't keep", () => {
    const made = shapesFromSvg(
      `<svg viewBox="0 0 100 100"><g transform="rotate(4)"><circle r="3" fill="red"/></g></svg>`,
      ["#FFFFFF"]
    );
    expect(made.shapes).toEqual([{ shape: "circle", r: 3 }]);
    expect(made.notes).toHaveLength(3);
    expect(shapesFromSvg("not svg", []).notes).toEqual(["That isn't an SVG."]);
  });
});

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
