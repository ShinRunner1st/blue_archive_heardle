import { describe, expect, it } from "vitest";

import {
  CONFIG,
  interpolate,
  mix,
  shardAlpha,
  trailColor,
} from "./cursorEffects";

describe("interpolate", () => {
  const stops = [
    [0, 0.42],
    [0.21, 0.72],
    [1, 1],
  ] as const;

  it("runs through each stop in turn", () => {
    expect(interpolate(stops, 0)).toBe(0.42);
    expect(interpolate(stops, 0.21)).toBeCloseTo(0.72);
    expect(interpolate(stops, 1)).toBe(1);
  });

  it("blends linearly between stops and holds the ends", () => {
    expect(interpolate(stops, 0.105)).toBeCloseTo((0.42 + 0.72) / 2);
    expect(interpolate(stops, -1)).toBe(0.42);
    expect(interpolate(stops, 2)).toBe(1);
  });

  it("grows a shard in, then holds it near full size", () => {
    const { scale } = CONFIG.shard;
    expect(interpolate(scale, 0)).toBe(0);
    expect(interpolate(scale, 0.22)).toBe(1);
    expect(interpolate(scale, 1)).toBeGreaterThan(0.8);
  });
});

describe("shardAlpha", () => {
  it("holds a shard steady through the first half of its life", () => {
    expect(shardAlpha(0)).toBe(1);
    expect(shardAlpha(0.5)).toBe(1);
  });

  it("then blinks once, dimming and coming back, before going out", () => {
    expect(shardAlpha(0.62)).toBeCloseTo(0.15);
    expect(shardAlpha(0.78)).toBeCloseTo(0.8);
    expect(shardAlpha(1)).toBe(0);
  });

  it("moves only the blink, so shards don't blink in step", () => {
    expect(shardAlpha(0.6, 0.02)).toBeCloseTo(shardAlpha(0.62));
    expect(shardAlpha(0.2, 0.05)).toBe(1);
    expect(shardAlpha(1, 0.05)).toBe(0);
  });
});

describe("mix", () => {
  it("blends two colours and clamps the amount", () => {
    expect(mix("#FFFFFF", "#000000", 0.5)).toBe("128,128,128");
    expect(mix("#FFFFFF", "#3D63FF", -1)).toBe("255,255,255");
    expect(mix("#FFFFFF", "#3D63FF", 5)).toBe("61,99,255");
  });
});

describe("trailColor", () => {
  it("runs bright blue at the head, navy at 42%, black at the tail", () => {
    expect(trailColor(0)).toBe("0,99,255");
    expect(trailColor(0.42)).toBe("0,23,71");
    expect(trailColor(1)).toBe("0,0,0");
  });
});
