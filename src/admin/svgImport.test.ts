import { describe, expect, it } from "vitest";

import { frameProblems } from "../content/validate";
import { rescalePath, shapesFromSvg } from "./svgImport";

describe("rescalePath", () => {
  const fit = { x0: 100, y0: 100, scale: 0.1 };

  it("moves absolute points, scales relative ones", () => {
    expect(rescalePath("M100 100L200 100l0 50H50V0z", fit)).toBe(
      "M0 0L10 0l0 5H-5V-10z"
    );
  });

  it("writes a moveto's further pairs as linetos, with their letter", () => {
    expect(rescalePath("M0 0 100 100", fit)).toBe("M-10 -10L0 0");
    expect(rescalePath("m0,0 10,10", fit)).toBe("m0 0l1 1");
  });

  it("scales an arc's radii and keeps its flags, run together or not", () => {
    expect(rescalePath("M100 100a50 50 0 011 1", fit)).toBe(
      "M0 0a5 5 0 0 1 0.1 0.1"
    );
    expect(rescalePath("M100 100A50 50 30 1 0 200 100", fit)).toBe(
      "M0 0A5 5 30 1 0 10 0"
    );
  });

  it("reads numbers written close: .5.5 and 1e2", () => {
    expect(rescalePath("M.5.5L1e2-1e1", { x0: 0, y0: 0, scale: 1 })).toBe(
      "M0.5 0.5L100 -10"
    );
  });

  it("stops on what isn't a path", () => {
    expect(() => rescalePath("M0 0X1 1", fit)).toThrow();
    expect(() => rescalePath("M0", fit)).toThrow();
    expect(() => rescalePath("1 1", fit)).toThrow();
  });
});

describe("shapesFromSvg", () => {
  it("fits any size round its middle, 12 units across, at the box's middle", () => {
    const made = shapesFromSvg(
      `<svg viewBox="0 0 512 512"><circle cx="256" cy="256" r="256"/></svg>`,
      ["#FFFFFF", "#FF0000"]
    );
    expect(made.shapes).toEqual([
      { shape: "circle", cx: 0, cy: 0, r: 6, fill: 1, at: [12, 12, 0, 1] },
    ]);
    expect(made.notes).toEqual([]);
  });

  it("takes colours from groups, currentColor and the palette", () => {
    const made = shapesFromSvg(
      `<svg viewBox="0 0 24 24" fill="#0f0">
        <g stroke="currentColor" stroke-width="2">
          <path d="M0 0h24" fill="none"/>
        </g>
        <rect x="0" y="0" width="12" height="12" style="fill:#FFFFFF"/>
        <polygon points="0,0 24,0 12,24" fill-rule="evenodd"/>
        <path d="M0 0" fill="none"/>
        <defs><path d="M0 0h1"/></defs>
      </svg>`,
      ["#FFFFFF", "#FF0000"]
    );
    expect(made.colors).toEqual(["#FFFFFF", "#FF0000", "#00FF00"]);
    expect(made.shapes).toEqual([
      {
        shape: "path",
        d: "M-6 -6h12",
        stroke: 1,
        strokeWidth: 1,
        at: [12, 12, 0, 1],
      },
      { shape: "path", d: "M-6 -6H0V0H-6Z", fill: 0, at: [12, 12, 0, 1] },
      {
        shape: "path",
        d: "M-6 -6L6 -6L0 6Z",
        fill: 2,
        evenOdd: true,
        at: [12, 12, 0, 1],
      },
    ]);
    expect(made.notes).toEqual([
      "1 shape(s) with no fill or outline were left out.",
    ]);
  });

  it("makes shapes the content check takes", () => {
    const made = shapesFromSvg(
      `<svg width="100" height="50"><ellipse cx="50" cy="25" rx="50" ry="25" stroke="#123456" stroke-width="4"/><line x1="0" y1="0" x2="100" y2="50" stroke="#000"/></svg>`,
      ["#FFFFFF"]
    );
    expect(made.shapes).toHaveLength(2);
    expect(
      frameProblems({
        id: "test",
        name: "Test",
        colors: made.colors,
        border: { width: 2, colors: [0] },
        ornament: { corners: ["tl"], shapes: made.shapes },
      })
    ).toEqual([]);
  });

  it("says what it couldn't keep", () => {
    const made = shapesFromSvg(
      `<svg viewBox="0 0 24 24"><g transform="rotate(4)"><circle r="3" fill="red"/></g></svg>`,
      ["#FFFFFF"]
    );
    expect(made.shapes).toHaveLength(1);
    expect(made.notes).toHaveLength(2);
    expect(shapesFromSvg("not svg", []).notes).toEqual(["That isn't an SVG."]);
  });
});
