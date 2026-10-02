import { describe, expect, it } from "vitest";

import { frameProblems } from "../content/validate";
import { parseTransform, shapesFromSvg, transformPath } from "./svgImport";

const move = (d: string, m = parseTransform("")) => transformPath(d, m).d;

describe("transformPath", () => {
  it("writes every command absolute, H and V as lines", () => {
    expect(move("M10 10l5 0h5v5H0V0z")).toBe(
      "M10 10L15 10L20 10L20 15L0 15L0 0Z"
    );
  });

  it("keeps a moveto's further pairs as lines, and z back to its start", () => {
    expect(move("m1 1 2 2z l1 1")).toBe("M1 1L3 3ZL2 2");
  });

  it("moves, sizes and turns points, curves and arcs", () => {
    const m = parseTransform("translate(10 0) rotate(90) scale(2)");
    expect(move("M1 0C1 1 2 2 3 3", m)).toBe("M10 2C8 2 6 4 4 6");
    expect(move("M0 0a1 2 0 011 1", m)).toBe("M10 0A2 4 90 0 1 8 2");
    // A mirror turns an arc's sweep the other way.
    expect(move("M0 0A1 1 0 0 1 2 0", parseTransform("scale(-1 1)"))).toBe(
      "M0 0A1 1 180 0 0 -2 0"
    );
  });

  it("reads numbers written close: .5.5 and 1e2", () => {
    expect(move("M.5.5L1e2-1e1")).toBe("M0.5 0.5L100 -10");
  });

  it("stops on what isn't a path", () => {
    expect(() => move("M0 0X1 1")).toThrow();
    expect(() => move("M0")).toThrow();
    expect(() => move("1 1")).toThrow();
  });

  it("measures an arc's bulge, not only its ends", () => {
    const { points } = transformPath("M0 0A5 5 0 0 1 10 0", parseTransform(""));
    expect(Math.min(...points.map(([, y]) => y))).toBeCloseTo(-5);
  });
});

const fitted = (svg: string, palette = ["#FFFFFF", "#FF0000"]) =>
  shapesFromSvg(svg, palette);

describe("shapesFromSvg", () => {
  it("fits the drawing, not its page, 12 units across at the box's middle", () => {
    // A small circle on a big page, as Inkscape's A4 page has it.
    const made = fitted(
      `<svg viewBox="0 0 210 297"><circle cx="105" cy="148" r="20" stroke="#000" stroke-width="0.26"/></svg>`
    );
    expect(made.shapes).toEqual([
      {
        shape: "circle",
        cx: 0,
        cy: 0,
        r: 6,
        fill: 1,
        stroke: 2,
        strokeWidth: 0.1,
        at: [12, 12, 0, 1],
      },
    ]);
  });

  it("follows the groups' moves and turns", () => {
    const made = fitted(
      `<svg viewBox="0 0 100 100"><g transform="translate(50 0)"><rect x="0" y="0" width="10" height="20" transform="rotate(90)"/></g><circle cx="0" cy="0" r="1"/></svg>`
    );
    // The rectangle, turned, runs left of x 50; the dot sits at 0.
    expect(made.shapes[0].d).toBe("M6 -1.06L6 1.29L1.29 1.29L1.29 -1.06Z");
    expect(made.notes).toEqual([]);
  });

  it("reads colours from groups, style sheets, rgb() and currentColor", () => {
    const made = fitted(
      `<svg viewBox="0 0 24 24" fill="#0f0">
        <style>.pink { fill: rgb(255, 107, 168); } /* Illustrator's way */</style>
        <g stroke="currentColor" stroke-width="2"><path d="M0 0h24" fill="none"/></g>
        <rect class="pink" x="0" y="0" width="12" height="12"/>
        <polygon points="0,0 24,0 12,24" fill-rule="evenodd"/>
        <path d="M0 0" fill="none"/>
        <defs><path d="M0 0h1"/></defs>
      </svg>`
    );
    expect(made.colors).toEqual(["#FFFFFF", "#FF0000", "#FF6BA8", "#00FF00"]);
    expect(
      made.shapes.map(({ fill, stroke, evenOdd }) => ({
        fill,
        stroke,
        evenOdd,
      }))
    ).toEqual([
      { fill: undefined, stroke: 1, evenOdd: undefined },
      { fill: 2, stroke: undefined, evenOdd: undefined },
      { fill: 3, stroke: undefined, evenOdd: true },
    ]);
    expect(made.notes).toEqual([
      "1 shape(s) with no fill or outline were left out.",
    ]);
  });

  it("leaves out what it can't draw, with a note, never half-made", () => {
    const made = fitted(
      `<svg width="100%"><circle cx="50%" cy="50" r="4"/><circle cx="5" cy="5" r="4"/><text>Hi</text></svg>`
    );
    expect(made.shapes).toHaveLength(1);
    expect(made.notes).toHaveLength(2);
    expect(fitted("not svg").notes).toEqual(["That isn't an SVG."]);
  });

  it("refuses more shapes than the ornament has room for", () => {
    const dots = Array.from(
      { length: 41 },
      (_, i) => `<circle cx="${i * 3}" cy="0" r="1"/>`
    ).join("");
    const made = fitted(`<svg>${dots}</svg>`);
    expect(made.shapes).toEqual([]);
    expect(made.colors).toEqual(["#FFFFFF", "#FF0000"]);
    expect(made.notes[0]).toMatch(/41 shapes/);
  });

  it("makes shapes the content check takes, from every kind there is", () => {
    const made = fitted(
      `<svg width="100" height="50" transform="scale(3)">
        <ellipse cx="50" cy="25" rx="50" ry="25" stroke="#123456" stroke-width="40"/>
        <g transform="skewX(20)"><ellipse cx="10" cy="10" rx="5" ry="3"/></g>
        <line x1="0" y1="0" x2="100" y2="50" stroke="#000"/>
        <polyline points="0 0 10 10 20 0" stroke="#000"/>
        <path d="M0 0a10 10 0 1 0 20 0" transform="rotate(30 5 5)"/>
      </svg>`,
      ["#FFFFFF"]
    );
    expect(made.shapes).toHaveLength(5);
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
});
