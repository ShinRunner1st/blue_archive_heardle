import type { Drift } from "../constants/cosmetics";

/**
 * Where each thing drifting over a cosmetic starts, how fast it goes and
 * how it sways: worked out from the cosmetic's id, so it's the same on
 * every page and every visit, and two cards wearing it move alike.
 */
export interface Mote {
  /** Across, and down for a twinkle, in % of the box. */
  x: number;
  y: number;
  /** Negative, so the first frame has them mid-way, not all at the top. */
  delay: number;
  seconds: number;
  /** In px. */
  size: number;
  color: string;
  /** How far it sways either way as it goes, in px. */
  sway: number;
  /** How far it turns over one crossing, in degrees. */
  turn: number;
}

/** A number from a string: the seed of a cosmetic's layout. */
function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Numbers from 0 to 1, the same run for the same seed (mulberry32). */
function randoms(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A point on the box's edge, `t` of the way round it (0 to 1), in %. */
function onEdge(t: number, inset: number): [number, number] {
  const side = Math.floor(t * 4) % 4;
  const along = inset + (t * 4 - Math.floor(t * 4)) * (100 - inset * 2);
  return (
    [
      [along, inset],
      [100 - inset, along],
      [100 - along, 100 - inset],
      [inset, 100 - along],
    ] as Array<[number, number]>
  )[side];
}

/**
 * The drift's things, spread evenly with a little chance in each place.
 * On a frame (`edge`) they keep to its edge, clear of the card's words:
 * twinkling round it, or falling and rising down its sides.
 */
export function driftLayout(
  drift: Drift<unknown>,
  colors: string[],
  seed: string,
  edge = false
): Mote[] {
  const random = randoms(hash(`${seed}|${drift.shape}|${drift.way}`));
  return Array.from({ length: drift.count }, (_, i) => {
    const spread = ((i + 0.15 + random() * 0.7) / drift.count) * 100;
    let x = spread;
    let y = random() * 100;
    if (edge && drift.way === "twinkle") {
      [x, y] = onEdge(spread / 100, 3);
    } else if (edge) {
      x = i % 2 === 0 ? 1 + random() * 7 : 92 + random() * 7;
    }
    const seconds = drift.seconds * (0.75 + random() * 0.5);
    const size = drift.size * (0.7 + random() * 0.6);
    return {
      x,
      y,
      delay: -random() * seconds,
      seconds,
      size,
      color: colors[i % colors.length] ?? "#FFFFFF",
      sway: size * (1 + random() * 2),
      turn: (random() < 0.5 ? -1 : 1) * (180 + random() * 360),
    };
  });
}
