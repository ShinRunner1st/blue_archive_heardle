import { describe, expect, it } from "vitest";

import { fakeContext } from "../../test/fakeCanvas";
import { StatsTally } from "../../types/stats";
import {
  drawRecapPicture,
  RecapStats,
  recapPictureContent,
  recapPictureName,
} from "./recapPicture";

function recap(overrides: Partial<RecapStats> = {}): RecapStats {
  const tally: StatsTally = [3, 2, 6, 9, 4, 1, 0, 25];
  return {
    mode: "daily",
    tally,
    current: 12,
    best: 14,
    songsGuessed: 40,
    songsTotal: 345,
    badgesEarned: 1,
    badgesTotal: 8,
    ...overrides,
  };
}

describe("the recap picture", () => {
  it("sums up a daily record", () => {
    const content = recapPictureContent(recap(), new Date(2026, 8, 28));

    expect(content).toEqual({
      tag: "DAILY RECAP",
      title: "Schale activity report",
      subtitle: "As of 28 September 2026",
      tiles: [
        { label: "Puzzles", value: "25" },
        { label: "Win rate", value: "88%" },
        { label: "Day streak", value: "12" },
        { label: "Best streak", value: "14" },
      ],
      bars: [
        { label: "1", count: 2 },
        { label: "2", count: 6 },
        { label: "3", count: 9 },
        { label: "4", count: 4 },
        { label: "5", count: 1 },
        { label: "6", count: 0 },
        { label: "X", count: 3, lost: true },
      ],
      footer: "Songs guessed 40/345 · OST badges 1/8",
    });
  });

  it("speaks of rounds and wins in a row on endless", () => {
    const content = recapPictureContent(recap({ mode: "endless" }));

    expect(content.tag).toBe("ENDLESS RECAP");
    expect(content.tiles.map((tile) => tile.label)).toEqual([
      "Rounds",
      "Win rate",
      "Win streak",
      "Best streak",
    ]);
  });

  it("has a win rate of 0% with nothing played", () => {
    const content = recapPictureContent(
      recap({ tally: [0, 0, 0, 0, 0, 0, 0, 0] })
    );
    expect(content.tiles[1].value).toBe("0%");
  });

  it("draws every number and the site's address", () => {
    const { ctx, texts } = fakeContext();
    drawRecapPicture(ctx, recapPictureContent(recap()), {
      backdrop: null,
      logo: null,
    });

    expect(texts).toEqual(
      expect.arrayContaining([
        "DAILY RECAP",
        "Schale activity report",
        "88%",
        "BEST STREAK",
        "X",
        "Songs guessed 40/345 · OST badges 1/8",
        "baheardle.com",
      ])
    );
  });

  it("names the file by mode and date", () => {
    expect(recapPictureName("daily", new Date(2026, 8, 28))).toBe(
      "baheardle-daily-recap-2026-09-28.png"
    );
  });
});
