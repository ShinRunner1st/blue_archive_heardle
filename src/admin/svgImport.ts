/**
 * An SVG drawn elsewhere, of any size, as an ornament's shapes: its paths,
 * circles, ellipses, rectangles, polygons and lines, with the moves and
 * turns its groups put on them and the colours its style sheet gives
 * them. The drawing itself (not its page) is fitted to 12 units across
 * round its middle, then placed in the middle of the corner's box to
 * drag, size and turn like a ready-made shape. Colours are found in the
 * palette or added to it. Nothing it can't draw is kept half-made: it's
 * left out, and a note says so.
 */
import type { FrameColor, OrnamentShape } from "../constants/cosmetics";

/** How wide the drawing comes in, in the ornament's 24-unit box. */
export const PASTED_SIZE = 12;
/** A path longer than this is too detailed for an ornament. */
const PATH_LIMIT = 6000;

export interface PastedShapes {
  shapes: OrnamentShape[];
  colors: string[];
  notes: string[];
}

/* ---------- Moves, turns and sizes, as matrices ---------- */

/** An SVG transform: (x, y) goes to (a x + c y + e, b x + d y + f). */
export type Matrix = [number, number, number, number, number, number];
const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0];

/** `outer` after `inner`. */
function multiply(outer: Matrix, inner: Matrix): Matrix {
  const [a1, b1, c1, d1, e1, f1] = outer;
  const [a2, b2, c2, d2, e2, f2] = inner;
  return [
    a1 * a2 + c1 * b2,
    b1 * a2 + d1 * b2,
    a1 * c2 + c1 * d2,
    b1 * c2 + d1 * d2,
    a1 * e2 + c1 * f2 + e1,
    b1 * e2 + d1 * f2 + f1,
  ];
}

const apply = (m: Matrix, x: number, y: number): [number, number] => [
  m[0] * x + m[2] * y + m[4],
  m[1] * x + m[3] * y + m[5],
];

/** How much a matrix grows lengths, on average. */
const growth = (m: Matrix) => Math.sqrt(Math.abs(m[0] * m[3] - m[1] * m[2]));

/** A transform attribute, as one matrix. */
export function parseTransform(text: string | null): Matrix {
  let matrix = IDENTITY;
  if (!text) return matrix;
  const steps = /(matrix|translate|scale|rotate|skewX|skewY)\s*\(([^)]*)\)/g;
  for (const [, name, list] of text.matchAll(steps)) {
    const n = list
      .trim()
      .split(/[\s,]+/)
      .filter(Boolean)
      .map(Number);
    const rad = ((n[0] ?? 0) * Math.PI) / 180;
    let step: Matrix = IDENTITY;
    if (name === "matrix" && n.length === 6) step = n as Matrix;
    if (name === "translate") step = [1, 0, 0, 1, n[0] ?? 0, n[1] ?? 0];
    if (name === "scale") step = [n[0] ?? 1, 0, 0, n[1] ?? n[0] ?? 1, 0, 0];
    if (name === "skewX") step = [1, 0, Math.tan(rad), 1, 0, 0];
    if (name === "skewY") step = [1, Math.tan(rad), 0, 1, 0, 0];
    if (name === "rotate") {
      const [cx = 0, cy = 0] = n.slice(1);
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      step = multiply(
        multiply([1, 0, 0, 1, cx, cy], [cos, sin, -sin, cos, 0, 0]),
        [1, 0, 0, 1, -cx, -cy]
      );
    }
    matrix = multiply(matrix, step);
  }
  return matrix;
}

/* ---------- Paths ---------- */

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

/** A path's commands, each with its numbers. Arc flags may run together. */
function parsePath(d: string): Array<[string, number[]]> {
  const segments: Array<[string, number[]]> = [];
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
        segments.push([command, []]);
        continue;
      }
    } else if (!command || command.toLowerCase() === "z") {
      throw new Error("a path's numbers come before any command");
    }
    const lower = command.toLowerCase();
    const values: number[] = [];
    for (let i = 0; i < PARAMETERS[lower]; i++) {
      const value = readNumber(lower === "a" && (i === 3 || i === 4));
      if (value === null) throw new Error("a path is missing a number");
      values.push(value);
    }
    segments.push([command, values]);
    // A moveto's further pairs are linetos.
    if (lower === "m") command = command === "m" ? "l" : "L";
  }
  return segments;
}

/** Points along an arc, as SVG draws it (the spec's F.6.5), to measure it. */
function arcPoints(
  [x1, y1]: [number, number],
  rxIn: number,
  ryIn: number,
  turn: number,
  large: number,
  sweep: number,
  [x2, y2]: [number, number]
): Array<[number, number]> {
  let rx = Math.abs(rxIn);
  let ry = Math.abs(ryIn);
  if (rx === 0 || ry === 0) return [[x2, y2]];
  const phi = (turn * Math.PI) / 180;
  const cos = Math.cos(phi);
  const sin = Math.sin(phi);
  const dx = (x1 - x2) / 2;
  const dy = (y1 - y2) / 2;
  const x1p = cos * dx + sin * dy;
  const y1p = -sin * dx + cos * dy;
  const fit = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);
  if (fit > 1) {
    rx *= Math.sqrt(fit);
    ry *= Math.sqrt(fit);
  }
  const sign = large === sweep ? -1 : 1;
  const top = rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p;
  const bottom = rx * rx * y1p * y1p + ry * ry * x1p * x1p;
  const k = sign * Math.sqrt(Math.max(0, top / bottom));
  const cxp = (k * rx * y1p) / ry;
  const cyp = (-k * ry * x1p) / rx;
  const cx = cos * cxp - sin * cyp + (x1 + x2) / 2;
  const cy = sin * cxp + cos * cyp + (y1 + y2) / 2;
  const angle = (ux: number, uy: number, vx: number, vy: number) =>
    Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
  const start = angle(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry);
  let span = angle(
    (x1p - cxp) / rx,
    (y1p - cyp) / ry,
    (-x1p - cxp) / rx,
    (-y1p - cyp) / ry
  );
  if (!sweep && span > 0) span -= 2 * Math.PI;
  if (sweep && span < 0) span += 2 * Math.PI;
  return Array.from({ length: 17 }, (_, i) => {
    const t = start + (span * i) / 16;
    const ex = rx * Math.cos(t);
    const ey = ry * Math.sin(t);
    return [cos * ex - sin * ey + cx, sin * ex + cos * ey + cy];
  });
}

export interface MovedPath {
  d: string;
  /** Every point it reaches, and its curves' handles, to measure it by. */
  points: Array<[number, number]>;
  /** An arc stretched unevenly, which SVG's arcs can't follow exactly. */
  stretchedArc: boolean;
}

/**
 * A path's `d` through a matrix, written with absolute commands only (a
 * turn makes H and V lines slanted, so they become L). An arc's radii and
 * turn follow the matrix while it keeps shapes' proportions.
 */
export function transformPath(d: string, m: Matrix): MovedPath {
  const out: string[] = [];
  const points: Array<[number, number]> = [];
  let stretchedArc = false;
  let current: [number, number] = [0, 0];
  let start: [number, number] = [0, 0];
  const scaleX = Math.hypot(m[0], m[1]);
  const scaleY = Math.hypot(m[2], m[3]);
  const even =
    Math.abs(scaleX - scaleY) < 1e-6 * Math.max(scaleX, 1) &&
    Math.abs(m[0] * m[2] + m[1] * m[3]) < 1e-6 * Math.max(scaleX * scaleX, 1);
  const mirrored = m[0] * m[3] - m[1] * m[2] < 0;
  const turnBy = (Math.atan2(m[1], m[0]) * 180) / Math.PI;

  const write = (letter: string, numbers: number[]) =>
    out.push(letter + numbers.map(tidy).join(" "));
  const moved = (p: [number, number]) => {
    const q = apply(m, p[0], p[1]);
    points.push(q);
    return q;
  };

  for (const [command, values] of parsePath(d)) {
    const lower = command.toLowerCase();
    const relative = command === lower && lower !== "z";
    const point = (i: number): [number, number] =>
      relative
        ? [current[0] + values[i], current[1] + values[i + 1]]
        : [values[i], values[i + 1]];
    switch (lower) {
      case "m":
      case "l":
      case "t": {
        const p = point(0);
        write(lower === "t" ? "T" : lower === "m" ? "M" : "L", moved(p));
        if (lower === "m") start = p;
        current = p;
        break;
      }
      case "h":
      case "v": {
        const p: [number, number] =
          lower === "h"
            ? [relative ? current[0] + values[0] : values[0], current[1]]
            : [current[0], relative ? current[1] + values[0] : values[0]];
        write("L", moved(p));
        current = p;
        break;
      }
      case "c":
      case "s":
      case "q": {
        const pairs = values.length / 2;
        const all = Array.from({ length: pairs }, (_, i) => point(i * 2));
        write(command.toUpperCase(), all.flatMap(moved));
        current = all[pairs - 1];
        break;
      }
      case "a": {
        const [rx, ry, turn, large, sweep] = values;
        const p = point(5);
        const from = apply(m, current[0], current[1]);
        const to = apply(m, p[0], p[1]);
        if (!even) stretchedArc = true;
        const arc: [number, number, number, number, number] = [
          rx * scaleX,
          ry * (even ? scaleX : scaleY),
          turn + turnBy,
          large,
          mirrored ? 1 - sweep : sweep,
        ];
        write("A", [...arc, ...to]);
        points.push(...arcPoints(from, ...arc, to));
        current = p;
        break;
      }
      case "z":
        out.push("Z");
        current = start;
        break;
    }
  }
  return { d: out.join(""), points, stretchedArc };
}

/* ---------- Reading the SVG ---------- */

/** #abc, #aabbcc, rgb() or a few names, as #AABBCC; anything else, null. */
function hexOf(value: string): string | null {
  const color = value.trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(color)) return color.toUpperCase();
  if (/^#[0-9a-f]{3}$/.test(color)) {
    return `#${[...color.slice(1)].map((c) => c + c).join("")}`.toUpperCase();
  }
  const rgb = /^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/.exec(color);
  if (rgb) {
    return `#${rgb
      .slice(1, 4)
      .map((n) => Math.min(255, Number(n)).toString(16).padStart(2, "0"))
      .join("")}`.toUpperCase();
  }
  const named: Record<string, string> = {
    black: "#000000",
    white: "#FFFFFF",
    red: "#FF0000",
    blue: "#0000FF",
    green: "#008000",
    yellow: "#FFFF00",
    gold: "#FFD700",
    pink: "#FFC0CB",
    orange: "#FFA500",
    purple: "#800080",
  };
  return named[color] ?? null;
}

/** A length in user units: a number, or px; anything else (%, mm), NaN. */
function lengthOf(value: string | null): number {
  if (value === null) return 0;
  const match = /^\s*([-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?)(px)?\s*$/i.exec(
    value
  );
  return match ? Number(match[1]) : NaN;
}

/** The SVG's style sheet: each rule's selector and its declarations. */
function styleRules(svg: Element): Array<[string, string]> {
  const rules: Array<[string, string]> = [];
  for (const style of svg.querySelectorAll("style")) {
    const css = (style.textContent ?? "").replace(/\/\*[\s\S]*?\*\//g, "");
    for (const [, selectors, body] of css.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
      for (const selector of selectors.split(",")) {
        if (selector.trim()) rules.push([selector.trim(), body]);
      }
    }
  }
  return rules;
}

/** A declaration in a style attribute or a rule's body. */
const declared = (body: string, name: string) =>
  new RegExp(`(?:^|;)\\s*${name}\\s*:\\s*([^;]+)`).exec(body)?.[1]?.trim() ??
  null;

/**
 * A property as SVG would give it: the element's style, then the style
 * sheet's rules, then its attribute, then the same from the groups round
 * it, as fill and stroke are inherited.
 */
function propertyOf(
  element: Element,
  name: string,
  rules: Array<[string, string]>
): string | null {
  for (let node: Element | null = element; node; node = node.parentElement) {
    const inline = declared(node.getAttribute("style") ?? "", name);
    if (inline !== null) return inline;
    let fromSheet: string | null = null;
    for (const [selector, body] of rules) {
      let matches = false;
      try {
        matches = node.matches(selector);
      } catch {
        // A selector this browser can't read: no match.
      }
      const value = matches ? declared(body, name) : null;
      if (value !== null) fromSheet = value;
    }
    if (fromSheet !== null) return fromSheet;
    const attribute = node.getAttribute(name);
    if (attribute !== null) return attribute;
    if (node.tagName.toLowerCase() === "svg" && !node.parentElement) break;
  }
  return null;
}

/** Every transform from the element up to the SVG, as one matrix. */
function matrixOf(element: Element): Matrix {
  let matrix = IDENTITY;
  for (
    let node: Element | null = element;
    node && node.tagName.toLowerCase() !== "svg";
    node = node.parentElement
  ) {
    matrix = multiply(parseTransform(node.getAttribute("transform")), matrix);
  }
  return matrix;
}

/** A shape as a path's `d`, in its own units. */
function asPath(element: Element): string | null {
  const n = (name: string) => lengthOf(element.getAttribute(name));
  switch (element.tagName.toLowerCase()) {
    case "path":
      return element.getAttribute("d");
    case "rect": {
      const [x, y, w, h] = [n("x"), n("y"), n("width"), n("height")];
      return `M${x} ${y}H${x + w}V${y + h}H${x}Z`;
    }
    case "circle":
    case "ellipse": {
      const [cx, cy] = [n("cx"), n("cy")];
      const rx = element.tagName.toLowerCase() === "circle" ? n("r") : n("rx");
      const ry = element.tagName.toLowerCase() === "circle" ? n("r") : n("ry");
      return `M${cx - rx} ${cy}A${rx} ${ry} 0 1 0 ${
        cx + rx
      } ${cy}A${rx} ${ry} 0 1 0 ${cx - rx} ${cy}Z`;
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
      return `M${n("x1")} ${n("y1")}L${n("x2")} ${n("y2")}`;
    default:
      return null;
  }
}

const SHAPES = "path, circle, ellipse, rect, polygon, polyline, line";

/** A shape on its way in, measured in the drawing's own space. */
interface Found {
  kind: "path" | "circle" | "ellipse";
  /** A path's `d`, or a circle's or ellipse's centre and radii. */
  d?: string;
  centre?: [number, number];
  radii?: [number, number];
  fill?: FrameColor;
  stroke?: FrameColor;
  strokeWidth?: number;
  evenOdd?: boolean;
}

/**
 * The SVG's shapes, each at `at` in the ornament's box (its middle
 * there), drawn 12 units across; none, with a note, if more than `room`.
 */
export function shapesFromSvg(
  text: string,
  palette: string[],
  { at = [12, 12], room = 40 }: { at?: [number, number]; room?: number } = {}
): PastedShapes {
  const colors = [...palette];
  const notes: string[] = [];
  const document = new DOMParser().parseFromString(text, "image/svg+xml");
  const svg = document.querySelector("svg");
  if (document.querySelector("parsererror") || !svg) {
    return { shapes: [], colors, notes: ["That isn't an SVG."] };
  }
  const rules = styleRules(svg);
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

  const found: Found[] = [];
  const points: Array<[number, number]> = [];
  const left = { units: 0, broken: 0, empty: 0, long: 0 };
  let stretched = false;
  for (const element of svg.querySelectorAll(SHAPES)) {
    // Shapes kept for reuse or masks aren't drawn as they are.
    if (element.closest("defs, clipPath, mask, symbol, pattern, marker")) {
      continue;
    }
    if (propertyOf(element, "display", rules) === "none") continue;
    const kind = element.tagName.toLowerCase();
    const fillValue = propertyOf(element, "fill", rules);
    // SVG fills a shape it says nothing of; lines are never filled.
    const fill =
      fillValue === null
        ? kind === "line" || kind === "polyline"
          ? undefined
          : main
        : colorOf(fillValue);
    const stroke = colorOf(propertyOf(element, "stroke", rules));
    if (fill === undefined && stroke === undefined) {
      left.empty++;
      continue;
    }
    const matrix = matrixOf(element);
    const n = (name: string) => lengthOf(element.getAttribute(name));
    const geometry = {
      circle: ["cx", "cy", "r"],
      ellipse: ["cx", "cy", "rx", "ry"],
      rect: ["x", "y", "width", "height"],
      line: ["x1", "y1", "x2", "y2"],
    }[kind];
    if (geometry?.some((name) => !Number.isFinite(n(name)))) {
      left.units++;
      continue;
    }
    const width = lengthOf(propertyOf(element, "stroke-width", rules) ?? "1");
    const shape: Found = {
      kind: "path",
      fill,
      stroke,
      strokeWidth:
        stroke === undefined
          ? undefined
          : (Number.isFinite(width) ? width : 1) * growth(matrix),
      evenOdd: propertyOf(element, "fill-rule", rules) === "evenodd",
    };
    // A circle or ellipse only moved and evenly sized stays one.
    const plain =
      matrix[1] === 0 &&
      matrix[2] === 0 &&
      matrix[0] > 0 &&
      Math.abs(matrix[0] - matrix[3]) < 1e-9;
    if ((kind === "circle" || kind === "ellipse") && plain) {
      const centre = apply(matrix, n("cx"), n("cy"));
      const rx = (kind === "circle" ? n("r") : n("rx")) * matrix[0];
      const ry = (kind === "circle" ? n("r") : n("ry")) * matrix[0];
      Object.assign(shape, { kind, centre, radii: [rx, ry] });
      points.push(
        [centre[0] - rx, centre[1] - ry],
        [centre[0] + rx, centre[1] + ry]
      );
    } else {
      const d = asPath(element);
      if (!d) {
        left.empty++;
        continue;
      }
      try {
        const moved = transformPath(d, matrix);
        if (moved.stretchedArc) stretched = true;
        shape.d = moved.d;
        points.push(...moved.points);
      } catch {
        left.broken++;
        continue;
      }
    }
    found.push(shape);
  }

  if (found.length > room) {
    return {
      shapes: [],
      colors: palette,
      notes: [
        `It has ${found.length} shapes, and this ornament has room for ${room} more (40 in all). Join them into fewer first: in Inkscape, select them and Path → Combine.`,
      ],
    };
  }

  // The drawing's own bounds, so its page and margins don't count.
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  const box = {
    left: Math.min(...xs),
    top: Math.min(...ys),
    right: Math.max(...xs),
    bottom: Math.max(...ys),
  };
  const across = Math.max(box.right - box.left, box.bottom - box.top);
  const scale = across > 0 ? PASTED_SIZE / across : 1;
  const middle: [number, number] = [
    (box.left + box.right) / 2,
    (box.top + box.bottom) / 2,
  ];
  const fit: Matrix = [
    scale,
    0,
    0,
    scale,
    -middle[0] * scale,
    -middle[1] * scale,
  ];

  const shapes: OrnamentShape[] = [];
  for (const shape of found) {
    let made: OrnamentShape;
    if (shape.kind === "path") {
      const d = transformPath(shape.d ?? "", fit).d;
      if (d.length > PATH_LIMIT) {
        left.long++;
        continue;
      }
      made = { shape: "path", d };
    } else {
      const [cx, cy] = apply(fit, ...(shape.centre ?? [0, 0]));
      const [rx, ry] = (shape.radii ?? [0, 0]).map((r) => tidy(r * scale));
      made =
        shape.kind === "circle"
          ? { shape: "circle", cx: tidy(cx), cy: tidy(cy), r: rx }
          : { shape: "ellipse", cx: tidy(cx), cy: tidy(cy), rx, ry };
    }
    if (shape.fill !== undefined) made.fill = shape.fill;
    if (shape.stroke !== undefined) {
      made.stroke = shape.stroke;
      // As thin or thick as an ornament's outline can be.
      made.strokeWidth = Math.min(
        12,
        Math.max(0.1, tidy((shape.strokeWidth ?? 1) * scale))
      );
    }
    if (shape.evenOdd) made.evenOdd = true;
    made.at = [at[0], at[1], 0, 1];
    shapes.push(made);
  }

  if (svg.querySelector("text, image, use, foreignObject")) {
    notes.push(
      "Its text, pictures and copies (use) aren't shapes, so they were left out: in Inkscape, Path → Object to Path first."
    );
  }
  if (left.units > 0) {
    notes.push(
      `${left.units} shape(s) sized in % or mm were left out: give them plain numbers.`
    );
  }
  if (left.broken > 0) {
    notes.push(`${left.broken} path(s) that couldn't be read were left out.`);
  }
  if (left.long > 0) {
    notes.push(
      `${left.long} path(s) too detailed for an ornament were left out: simplify them first (Inkscape: Path → Simplify).`
    );
  }
  if (left.empty > 0) {
    notes.push(`${left.empty} shape(s) with no fill or outline were left out.`);
  }
  if (stretched) {
    notes.push(
      "Some curves were stretched unevenly inside the SVG and may look a little off."
    );
  }
  if (unreadColor) {
    notes.push(
      "Some colours (a gradient, say) couldn't be read, so they took the palette's colour 2: pick them again."
    );
  }
  if (shapes.length === 0 && notes.length === 0) {
    notes.push("It has no shapes to draw.");
  }
  return { shapes, colors: shapes.length > 0 ? colors : palette, notes };
}
