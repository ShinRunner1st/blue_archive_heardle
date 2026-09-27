import { describe, expect, it } from "vitest";

import { fakeContext } from "../../test/fakeCanvas";
import { StatsTally } from "../../types/stats";
import {
  drawRecapPicture,
  RecapStats,
  recapPictureContent,
  recapPictureName,
  timeAttackRecapContent,
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

describe("the time attack recap", () => {
  const runs = [
    { id: 1, score: 12, answered: 20, answers: "typed" as const, clip: 2 },
    { id: 2, score: 18, answered: 22, answers: "choice" as const, clip: 2 },
    { id: 3, score: 9, answered: 15, answers: "choice" as const, clip: 7 },
  ];
  const stats = {
    runs: 3,
    best: { typed: 12, choice: 18 },
    right: 39,
    answered: 57,
    last: runs[2],
  };

  it("counts runs and the best of each way to answer", () => {
    const content = timeAttackRecapContent(stats, runs, new Date(2026, 8, 28));

    expect(content.tag).toBe("TIME ATTACK RECAP");
    expect(content.subtitle).toBe("As of 28 September 2026");
    expect(content.tiles).toEqual([
      { label: "Runs", value: "3" },
      { label: "Right", value: "68%" },
      { label: "Best typed", value: "12" },
      { label: "Best 4-Choice", value: "18" },
    ]);
    expect(content.footer).toBe("Songs named 39 of 57 in time attack runs");
  });

  it("draws the best run at each clip length", () => {
    const content = timeAttackRecapContent(stats, runs);

    expect(content.barsLabel).toBe("Best run by clip length");
    expect(content.bars).toEqual([
      { label: "1s", count: 0 },
      { label: "2s", count: 18 },
      { label: "3s", count: 0 },
      { label: "5s", count: 0 },
      { label: "7s", count: 9 },
    ]);

    const { ctx, texts } = fakeContext();
    drawRecapPicture(ctx, content, { backdrop: null, logo: null });
    expect(texts).toContain("BEST RUN BY CLIP LENGTH");
  });
});
