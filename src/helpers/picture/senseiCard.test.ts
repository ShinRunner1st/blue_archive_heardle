import { describe, expect, it } from "vitest";

import { students } from "../../constants/students";
import { fakeContext } from "../../test/fakeCanvas";
import { SenseiStats } from "../senseiStats";
import {
  drawSenseiCard,
  senseiCardContent,
  senseiCardName,
} from "./senseiCard";

const stats: SenseiStats = {
  songsGuessed: 12,
  songsTotal: 345,
  badgesEarned: 1,
  badgesTotal: 8,
  bestDailyStreak: 4,
  bestWinStreak: 9,
  timeAttackBest: 15,
  studentsFound: 30,
  studentsTotal: 262,
  roundsPlayed: 1,
  since: new Date(2026, 8, 27),
};

describe("senseiCardContent", () => {
  it("puts the player's record on the card", () => {
    const content = senseiCardContent({
      stats,
      name: "Arona Sensei",
      favourite: students[5],
      issued: new Date(2026, 8, 28),
    });

    expect(content.name).toBe("Arona Sensei");
    expect(content.favourite).toBe(students[5].name);
    expect(content.issued).toBe("28 Sept 2026");
    expect(content.since).toBe("27 Sept 2026");
    expect(content.tiles.map(({ value }) => value)).toEqual([
      "12/345",
      "1/8",
      "30/262",
      "4",
      "9",
      "15",
    ]);
    expect(content.footer).toBe("1 round played");

    const { ctx, texts } = fakeContext();
    drawSenseiCard(ctx, content, {
      backdrop: null,
      logo: null,
      portrait: null,
    });
    expect(texts).toContain("Arona Sensei");
    expect(texts).toContain("baheardle.com");
  });

  it("does without a name or a favourite", () => {
    const content = senseiCardContent({
      stats: { ...stats, since: null },
      name: " ",
      favourite: null,
      issued: new Date(2026, 8, 28),
    });
    expect(content.name).toBe("Sensei");
    expect(content.favourite).toBe("Not picked yet");
    expect(content.since).toBeNull();
  });

  it("shows the name as given, and draws the same code for it", () => {
    const input = {
      stats,
      name: "Plana",
      favourite: null,
      issued: new Date(),
    };
    expect(senseiCardContent(input).name).toBe("Plana");
    expect(senseiCardContent(input).stripes).toEqual(
      senseiCardContent(input).stripes
    );
  });

  it("names the file by date", () => {
    expect(senseiCardName(new Date(2026, 8, 28))).toBe(
      "baheardle-sensei-card-2026-09-28.png"
    );
  });
});
