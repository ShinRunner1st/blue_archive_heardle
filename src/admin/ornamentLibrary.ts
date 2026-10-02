/**
 * Ready-made shapes for a frame's ornament, so one is picked and placed
 * rather than typed: each drawn round its own middle, about 12 units
 * across, so moving, turning and sizing it works round that middle.
 */
import type { FrameColor, OrnamentShape } from "../constants/cosmetics";

/** Which of the palette's colours a part of a ready-made shape takes. */
type Role = "main" | "second";

type LibraryShape = Omit<OrnamentShape, "fill" | "stroke"> & {
  fill?: Role;
  stroke?: Role;
};

export interface LibraryItem {
  name: string;
  shapes: LibraryShape[];
}

const round = (value: number) => Math.round(value * 100) / 100;

/** A star of `points` points, as a path. */
function star(points: number, outer: number, inner: number): string {
  const corners = Array.from({ length: points * 2 }, (_, i) => {
    const radius = i % 2 === 0 ? outer : inner;
    const angle = (Math.PI * i) / points - Math.PI / 2;
    return `${round(Math.cos(angle) * radius)} ${round(
      Math.sin(angle) * radius
    )}`;
  });
  return `M${corners.join("L")}Z`;
}

/** Petals in a ring, each a circle, as one path. */
function petals(count: number, from: number, size: number): string {
  return Array.from({ length: count }, (_, i) => {
    const angle = (2 * Math.PI * i) / count - Math.PI / 2;
    const x = round(Math.cos(angle) * from + size);
    const y = round(Math.sin(angle) * from);
    return `M${x} ${y}a${size} ${size} 0 1 0 ${
      -2 * size
    } 0a${size} ${size} 0 1 0 ${2 * size} 0`;
  }).join("");
}

export const ORNAMENT_LIBRARY: LibraryItem[] = [
  {
    name: "Star",
    shapes: [{ shape: "path", d: star(5, 6, 2.6), fill: "main" }],
  },
  {
    name: "Sparkle",
    shapes: [
      {
        shape: "path",
        d: "M0 -6Q0.9 -0.9 6 0Q0.9 0.9 0 6Q-0.9 0.9 -6 0Q-0.9 -0.9 0 -6Z",
        fill: "main",
      },
    ],
  },
  {
    name: "Heart",
    shapes: [
      {
        shape: "path",
        d: "M0 5C-6 1 -6 -4 -3 -4.8C-1.4 -5.2 -0.3 -4.1 0 -3C0.3 -4.1 1.4 -5.2 3 -4.8C6 -4 6 1 0 5Z",
        fill: "main",
      },
    ],
  },
  {
    name: "Flower",
    shapes: [
      { shape: "path", d: petals(5, 3.2, 2.4), fill: "main" },
      { shape: "circle", r: 1.7, fill: "second" },
    ],
  },
  {
    name: "Diamond",
    shapes: [{ shape: "path", d: "M0 -6L4.2 0L0 6L-4.2 0Z", fill: "main" }],
  },
  { name: "Dot", shapes: [{ shape: "circle", r: 2.5, fill: "main" }] },
  {
    name: "Ring",
    shapes: [{ shape: "circle", r: 4.5, stroke: "main", strokeWidth: 1.6 }],
  },
  {
    name: "Halo",
    shapes: [
      {
        shape: "ellipse",
        rx: 6,
        ry: 2.6,
        stroke: "main",
        strokeWidth: 1.6,
      },
      {
        shape: "path",
        d: "M0 -6v2.4M-5 -4.6l1.5 1.5M5 -4.6l-1.5 1.5",
        stroke: "main",
        strokeWidth: 1.3,
      },
    ],
  },
  {
    name: "Music note",
    shapes: [
      {
        shape: "path",
        d: "M-0.4 -6H4.6V-3.6H1.6V3.2A2.6 2.2 0 1 1 -0.4 1.2Z",
        fill: "main",
      },
    ],
  },
  {
    name: "Moon",
    shapes: [
      {
        shape: "path",
        d: "M1.5 -5.8A6 6 0 1 0 1.5 5.8A4.6 4.6 0 1 1 1.5 -5.8Z",
        fill: "main",
      },
    ],
  },
  {
    name: "Leaf",
    shapes: [
      { shape: "path", d: "M-6 0Q0 -6 6 0Q0 6 -6 0Z", fill: "main" },
      {
        shape: "path",
        d: "M-5 0H4",
        stroke: "second",
        strokeWidth: 0.8,
      },
    ],
  },
  {
    name: "Bow",
    shapes: [
      { shape: "path", d: "M0 0L-6 -4V4ZM0 0L6 -4V4Z", fill: "main" },
      { shape: "circle", r: 1.6, fill: "second" },
    ],
  },
  {
    name: "Triangle",
    shapes: [{ shape: "path", d: "M0 -5.5L5.5 4.5H-5.5Z", fill: "main" }],
  },
  {
    name: "Corner line",
    shapes: [
      {
        shape: "path",
        d: "M-5 6V-1A5 5 0 0 1 0 -6H7",
        stroke: "main",
        strokeWidth: 2,
      },
    ],
  },
  {
    name: "Corner bracket",
    shapes: [
      { shape: "path", d: "M-5 6V-5H6", stroke: "main", strokeWidth: 2 },
    ],
  },
  {
    name: "Wave",
    shapes: [
      {
        shape: "path",
        d: "M-6 0Q-4.5 -3 -3 0T0 0T3 0T6 0",
        stroke: "main",
        strokeWidth: 1.4,
      },
    ],
  },
];

/**
 * A ready-made shape's parts in a frame, at a place, its colours the
 * palette's: the second colour for its main part where there is one (the
 * first is usually the border's), the third for its accents.
 */
export function placed(
  item: LibraryItem,
  colors: string[],
  at: [number, number]
): OrnamentShape[] {
  const role = (which: Role | undefined): FrameColor | undefined =>
    which === undefined
      ? undefined
      : which === "main"
      ? Math.min(1, colors.length - 1)
      : Math.min(2, colors.length - 1);
  return item.shapes.map(({ fill, stroke, ...shape }) => {
    const made: OrnamentShape = { ...shape, at: [at[0], at[1], 0, 1] };
    const fillAt = role(fill);
    const strokeAt = role(stroke);
    if (fillAt !== undefined) made.fill = fillAt;
    if (strokeAt !== undefined) made.stroke = strokeAt;
    return made;
  });
}
