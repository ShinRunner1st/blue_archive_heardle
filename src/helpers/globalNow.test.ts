import { describe, expect, it } from "vitest";

import {
  formatLeft,
  isEmpty,
  parseNow,
  parseNowFile,
  runningAt,
} from "./globalNow";

const DAY = 86_400;
const NOW = 1_790_000_000;

const file = {
  banners: [
    {
      students: [
        { id: 10089, name: "Aru (Dress)" },
        { id: "x", name: "Broken" },
      ],
      start: NOW - DAY,
      end: NOW + DAY,
    },
    { students: [], start: NOW - DAY, end: NOW + DAY },
  ],
  events: [
    { name: "Special Mission: Lore Pursuit", start: NOW - DAY, end: NOW - 1 },
  ],
  raids: [
    {
      kind: "Total Assault",
      name: "Drumbarka",
      terrain: "Street",
      start: NOW - DAY,
      end: NOW + 2 * DAY,
    },
    { kind: "Grand Assault", start: NOW + DAY, end: NOW + 3 * DAY },
    { name: "No kind", start: NOW, end: NOW + DAY },
  ],
};

describe("parseNow", () => {
  it("keeps what is well formed and drops the rest", () => {
    const data = parseNow(file)!;

    expect(data.banners).toHaveLength(1);
    expect(data.banners[0].students).toEqual([
      { id: 10089, name: "Aru (Dress)" },
    ]);
    expect(data.events).toHaveLength(1);
    expect(data.raids.map((raid) => raid.kind)).toEqual([
      "Total Assault",
      "Grand Assault",
    ]);
  });

  it("is null for something that isn't the file", () => {
    expect(parseNow(null)).toBeNull();
    expect(parseNow("oops")).toBeNull();
    expect(isEmpty(parseNow({})!)).toBe(true);
  });
});

describe("runningAt", () => {
  it("leaves out what has ended or not begun", () => {
    const running = runningAt(parseNow(file)!, NOW * 1000);

    expect(running.banners).toHaveLength(1);
    expect(running.events).toHaveLength(0);
    expect(running.raids.map((raid) => raid.name)).toEqual(["Drumbarka"]);
  });

  it("is empty once everything is over", () => {
    expect(isEmpty(runningAt(parseNow(file)!, (NOW + 10 * DAY) * 1000))).toBe(
      true
    );
  });
});

describe("formatLeft", () => {
  it("counts days and hours, then hours and minutes", () => {
    expect(formatLeft((3 * DAY + 4 * 3600 + 59) * 1000)).toBe("3d 4h");
    expect(formatLeft((5 * 3600 + 12 * 60) * 1000)).toBe("5h 12m");
    expect(formatLeft(30_000)).toBe("1m");
  });
});

describe("parseNow pictures", () => {
  it("keeps only pictures the build script copied", () => {
    const data = parseNow({
      events: [
        { name: "A", start: NOW, end: NOW + DAY, logo: "img/858_En.0fca.webp" },
        { name: "B", start: NOW, end: NOW + DAY, logo: "https://x.io/a.webp" },
      ],
      raids: [
        {
          kind: "Total Assault",
          start: NOW,
          end: NOW + DAY,
          picture: "img/Boss_Portrait_EN0022_Lobby.a1c2.webp",
        },
        {
          kind: "Grand Assault",
          start: NOW,
          end: NOW + DAY,
          picture: "../secret.webp",
        },
      ],
    })!;

    expect(data.events.map((event) => event.logo)).toEqual([
      "img/858_En.0fca.webp",
      undefined,
    ]);
    expect(data.raids.map((raid) => raid.picture)).toEqual([
      "img/Boss_Portrait_EN0022_Lobby.a1c2.webp",
      undefined,
    ]);
  });
});

describe("parseNowFile", () => {
  it("reads each server's schedule", () => {
    const jp = { events: [{ name: "JP", start: NOW, end: NOW + DAY }] };
    const both = parseNowFile({ global: file, jp })!;

    expect(both.global?.raids).toHaveLength(2);
    expect(both.jp?.events.map(({ name }) => name)).toEqual(["JP"]);
  });

  it("reads a file from before JP as Global's", () => {
    const old = parseNowFile(file)!;

    expect(old.global?.banners).toHaveLength(1);
    expect(old.jp).toBeNull();
  });
});
