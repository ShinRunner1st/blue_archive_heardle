/**
 * An SVG drawn elsewhere, of any size, as an ornament's shapes: its paths,
 * circles, ellipses, rectangles, polygons and lines, rescaled so the
 * drawing is 12 units across round its own middle, then placed in the
 * middle of the corner's box to drag, size and turn like a ready-made
 * shape. Colours are found in the palette or added to it.
 */
import type { FrameColor, OrnamentShape } from "../constants/cosmetics";

/** How wide the drawing comes in, in the ornament's 24-unit box. */
export const PASTED_SIZE = 12;

export interface PastedShapes {
  shapes: OrnamentShape[];
  colors: string[];
  notes: string[];
}

/** A rescale: a point (x, y) goes to ((x - x0) * scale, (y - y0) * scale). */
interface Fit {
  x0: number;
  y0: number;
  scale: number;
}

const tidy = (value: number) => {
  const rounded = Math.round(value * 100) / 100;
  return Object.is(rounded, -0) ? 0 : rounded;
};

/** How many numbers each path command takes, at a time. */
const PARAMETERS: Record<string, number> = {
  m: 2,
  l: 2,
  t: 2,
  h: 1,
  v: 1,
  c: 6,
  s: 4,
  q: 4,
  a: 7,
  z: 0,
};

/**
 * A path's `d` rescaled: absolute points moved and scaled, relative ones
 * scaled, an arc's radii scaled and its turn and flags kept. Arc flags may
 * be written run together ("a1 1 0 011 1"), as minifiers do.
 */
export function rescalePath(d: string, fit: Fit): string {
  const out: string[] = [];
  let at = 0;
  const skip = () => {
    while (at < d.length && /[\s,]/.test(d[at])) at++;
  };
  const readNumber = (flag: boolean): number | null => {
    skip();
    if (flag) {
      const char = d[at];
      if (char !== "0" && char !== "1") return null;
      at++;
      return Number(char);
    }
    const match = /^[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/.exec(
      d.slice(at)
    );
    if (!match) return null;
    at += match[0].length;
    return Number(match[0]);
  };
  let command = "";
  for (;;) {
    skip();
    if (at >= d.length) break;
    if (/[a-zA-Z]/.test(d[at])) {
      command = d[at++];
      if (!(command.toLowerCase() in PARAMETERS)) {
        throw new Error(`a path command "${command}" isn't SVG's`);
      }
      if (command.toLowerCase() === "z") {
        out.push(command);
        continue;
      }
    } else if (!command || command.toLowerCase() === "z") {
      throw new Error("a path's numbers come before any command");
    }
    const lower = command.toLowerCase();
    const relative = command === lower;
    const values: number[] = [];
    for (let i = 0; i < PARAMETERS[lower]; i++) {
      const value = readNumber(lower === "a" && (i === 3 || i === 4));
      if (value === null) throw new Error("a path is missing a number");
      values.push(value);
    }
    const x = (value: number) =>
      relative ? value * fit.scale : (value - fit.x0) * fit.scale;
    const y = (value: number) =>
      relative ? value * fit.scale : (value - fit.y0) * fit.scale;
    const moved =
      lower === "h"
        ? [x(values[0])]
        : lower === "v"
        ? [y(values[0])]
        : lower === "a"
        ? [
            values[0] * fit.scale,
            values[1] * fit.scale,
            values[2],
            values[3],
            values[4],
            x(values[5]),
            y(values[6]),
          ]
        : values.map((value, i) => (i % 2 === 0 ? x(value) : y(value)));
    // Every group with its letter, so numbers never run together.
    out.push(command + moved.map(tidy).join(" "));
    // A moveto's further pairs are linetos.
    if (lower === "m") command = relative ? "l" : "L";
  }
  return out.join("");
}

/** #abc or #aabbcc, as #AABBCC; anything else, null. */
function hexOf(value: string): string | null {
  const color = value.trim();
  if (/^#[0-9a-f]{6}$/i.test(color)) return color.toUpperCase();
  if (/^#[0-9a-f]{3}$/i.test(color)) {
    return `#${[...color.slice(1)].map((c) => c + c).join("")}`.toUpperCase();
  }
  const named: Record<string, string> = {
    black: "#000000",
    white: "#FFFFFF",
  };
  return named[color.toLowerCase()] ?? null;
}

/** A property as the element has it: its own, or from a group round it. */
function inherited(element: Element, name: string): string | null {
  for (
    let node: Element | null = element;
    node && node.tagName.toLowerCase() !== "#document";
    node = node.parentElement
  ) {
    const style = node.getAttribute("style") ?? "";
    const inStyle = new RegExp(`(?:^|;)\\s*${name}\\s*:\\s*([^;]+)`).exec(
      style
    );
    const value = inStyle?.[1]?.trim() ?? node.getAttribute(name);
    if (value !== null) return value;
    if (node.tagName.toLowerCase() === "svg") break;
  }
  return null;
}

const numberOf = (element: Element, name: string) =>
  Number(element.getAttribute(name) ?? 0);

/** A rectangle, polygon, polyline or line as a path's `d`. */
function asPath(element: Element): string | null {
  switch (element.tagName.toLowerCase()) {
    case "path":
      return element.getAttribute("d");
    case "rect": {
      const [x, y, w, h] = ["x", "y", "width", "height"].map((name) =>
        numberOf(element, name)
      );
      return `M${x} ${y}H${x + w}V${y + h}H${x}Z`;
    }
    case "polygon":
    case "polyline": {
      const points = (element.getAttribute("points") ?? "")
        .trim()
        .split(/[\s,]+/)
        .map(Number);
      const pairs: string[] = [];
      for (let i = 0; i + 1 < points.length; i += 2) {
        pairs.push(`${points[i]} ${points[i + 1]}`);
      }
      if (pairs.length < 2) return null;
      const close = element.tagName.toLowerCase() === "polygon" ? "Z" : "";
      return `M${pairs.join("L")}${close}`;
    }
    case "line":
      return `M${numberOf(element, "x1")} ${numberOf(element, "y1")}L${numberOf(
        element,
        "x2"
      )} ${numberOf(element, "y2")}`;
    default:
      return null;
  }
}

/** The drawing's box: its viewBox, or its width and height, or 24. */
function boxOf(svg: Element): [number, number, number, number] {
  const view = svg
    .getAttribute("viewBox")
    ?.trim()
    .split(/[\s,]+/)
    .map(Number);
  if (view?.length === 4 && view.every(Number.isFinite) && view[2] > 0) {
    return view as [number, number, number, number];
  }
  const width = parseFloat(svg.getAttribute("width") ?? "");
  const height = parseFloat(svg.getAttribute("height") ?? "");
  if (width > 0 && height > 0) return [0, 0, width, height];
  return [0, 0, 24, 24];
}

const SHAPES = "path, circle, ellipse, rect, polygon, polyline, line";

/**
 * The SVG's shapes, each at `at` in the ornament's box (its middle
 * there), drawn 12 units across.
 */
export function shapesFromSvg(
  text: string,
  palette: string[],
  at: [number, number] = [12, 12]
): PastedShapes {
  const colors = [...palette];
  const notes: string[] = [];
  const document = new DOMParser().parseFromString(text, "image/svg+xml");
  const svg = document.querySelector("svg");
  if (document.querySelector("parsererror") || !svg) {
    return { shapes: [], colors, notes: ["That isn't an SVG."] };
  }
  const [left, top, width, height] = boxOf(svg);
  const scale = PASTED_SIZE / Math.max(width, height || width);
  const fit: Fit = {
    x0: left + width / 2,
    y0: top + height / 2,
    scale,
  };
  // The drawing's main colour where an icon leaves it to the page: the
  // palette's second, as ready-made shapes take.
  const main = Math.min(1, colors.length - 1);
  let unreadColor = false;
  const colorOf = (value: string | null): FrameColor | undefined => {
    if (value === null || value === "none" || value === "transparent") {
      return undefined;
    }
    if (value === "currentColor") return main;
    const hex = hexOf(value);
    if (!hex) {
      unreadColor = true;
      return main;
    }
    const found = colors.indexOf(hex);
    if (found >= 0) return found;
    colors.push(hex);
    return colors.length - 1;
  };

  const shapes: OrnamentShape[] = [];
  let moved = false;
  let skipped = 0;
  for (const element of svg.querySelectorAll(SHAPES)) {
    // Shapes kept for reuse or masks aren't drawn as they are.
    if (element.closest("defs, clipPath, mask, symbol")) continue;
    if (element.closest("[transform]")) moved = true;
    const kind = element.tagName.toLowerCase();
    const fillValue = inherited(element, "fill");
    const strokeValue = inherited(element, "stroke");
    // SVG fills a shape it says nothing of; lines are never filled.
    const fill =
      fillValue === null
        ? kind === "line" || kind === "polyline"
          ? undefined
          : main
        : colorOf(fillValue);
    const stroke = colorOf(strokeValue);
    if (fill === undefined && stroke === undefined) {
      skipped++;
      continue;
    }
    let shape: OrnamentShape;
    if (kind === "circle" || kind === "ellipse") {
      const cx = (numberOf(element, "cx") - fit.x0) * scale;
      const cy = (numberOf(element, "cy") - fit.y0) * scale;
      shape =
        kind === "circle"
          ? {
              shape: "circle",
              cx: tidy(cx),
              cy: tidy(cy),
              r: tidy(numberOf(element, "r") * scale),
            }
          : {
              shape: "ellipse",
              cx: tidy(cx),
              cy: tidy(cy),
              rx: tidy(numberOf(element, "rx") * scale),
              ry: tidy(numberOf(element, "ry") * scale),
            };
    } else {
      const d = asPath(element);
      if (!d) {
        skipped++;
        continue;
      }
      try {
        shape = { shape: "path", d: rescalePath(d, fit) };
      } catch (problem) {
        notes.push(`A shape was left out: ${(problem as Error).message}.`);
        continue;
      }
    }
    if (fill !== undefined) shape.fill = fill;
    if (stroke !== undefined) {
      shape.stroke = stroke;
      shape.strokeWidth = tidy(
        Number(inherited(element, "stroke-width") ?? 1) * scale
      );
    }
    if (inherited(element, "fill-rule") === "evenodd") shape.evenOdd = true;
    shape.at = [at[0], at[1], 0, 1];
    shapes.push(shape);
  }
  if (shapes.length === 0 && notes.length === 0) {
    notes.push("It has no shapes to draw.");
  }
  if (moved) {
    notes.push(
      "Some shapes were moved or turned inside the SVG (a transform), which isn't kept, so they may sit off: in Inkscape, Path → Object to Path first."
    );
  }
  if (unreadColor) {
    notes.push(
      "Some colours weren't #rrggbb, so they took the palette's colour 2: pick them again."
    );
  }
  if (skipped > 0) {
    notes.push(`${skipped} shape(s) with no fill or outline were left out.`);
  }
  return { shapes, colors, notes };
}
