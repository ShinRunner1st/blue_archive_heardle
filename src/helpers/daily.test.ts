import { afterEach, describe, expect, it, vi } from "vitest";

import { songs } from "../constants";
import { DAILY_EPOCH } from "../constants/game";
import { dailyOrder } from "../constants/dailyOrder";
import { dailySong, dayNumber, formatCountdown, msUntilNextDay } from "./daily";

function at(iso: string) {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(iso));
}

afterEach(() => {
  vi.useRealTimers();
});

describe("dayNumber", () => {
  it("is 1 on the launch day", () => {
    at(`${DAILY_EPOCH}T09:00:00`);

    expect(dayNumber()).toBe(1);
  });

  it("does not roll over until local midnight", () => {
    at(`${DAILY_EPOCH}T23:59:00`);
    expect(dayNumber()).toBe(1);

    at("2026-09-28T00:01:00");
    expect(dayNumber()).toBe(2);
  });

  it("is 1, not 0, for a player whose calendar is still on the day before", () => {
    at("2026-09-26T20:00:00");

    expect(dayNumber()).toBe(1);
  });

  it("counts whole calendar days, not 24-hour blocks", () => {
    // Late one evening and early the next morning are 9 hours apart but two
    // different puzzles.
    at("2026-10-01T22:00:00");
    const evening = dayNumber();

    at("2026-10-02T07:00:00");
    expect(dayNumber()).toBe(evening + 1);
  });
});

describe("dailySong", () => {
  it("gives the same answer every time it is asked", () => {
    expect(dailySong(57)).toEqual(dailySong(57));
  });

  it("only ever returns songs from the list", () => {
    [1, 2, 100, 341, 342].forEach((day) => {
      expect(songs).toContainEqual(dailySong(day));
    });
  });

  it("plays every track once before repeating any", () => {
    const seen = new Set(
      Array.from(
        { length: songs.length },
        (_, index) => dailySong(index + 1).themeNo
      )
    );

    expect(seen.size).toBe(songs.length);
  });

  it("wraps round rather than running out", () => {
    expect(dailySong(songs.length + 1)).toEqual(dailySong(1));
  });

  it("survives a clock set before the epoch", () => {
    expect(songs).toContainEqual(dailySong(-5));
    expect(songs).toContainEqual(dailySong(0));
  });
});

describe("msUntilNextDay", () => {
  it("counts down to local midnight", () => {
    at(`${DAILY_EPOCH}T23:00:00`);

    expect(msUntilNextDay()).toBe(60 * 60 * 1000);
  });
});

describe("formatCountdown", () => {
  it("shows hours and minutes while both remain", () => {
    expect(formatCountdown(5 * 3600_000 + 12 * 60_000)).toBe("5h 12m");
  });

  it("drops the hours once they run out", () => {
    expect(formatCountdown(12 * 60_000)).toBe("12m");
  });

  it("stays readable in the last minute", () => {
    expect(formatCountdown(30_000)).toBe("less than a minute");
    expect(formatCountdown(0)).toBe("any moment now");
  });
});

/**
 * The schedule is checked in so that adding songs cannot change a day that has
 * already been played. If the two drift apart, days either repeat a song or
 * resolve to a fallback, so this guards the generated file rather than the
 * algorithm.
 */
describe("the checked-in daily schedule", () => {
  it("covers every song exactly once", () => {
    expect(dailyOrder).toHaveLength(songs.length);
    expect(new Set(dailyOrder).size).toBe(songs.length);
  });

  it("schedules only themes that exist in the song list", () => {
    const known = new Set(songs.map((song) => song.themeNo));
    const unknown = dailyOrder.filter((themeNo) => !known.has(themeNo));

    expect(unknown).toEqual([]);
  });

  it("leaves no song unscheduled", () => {
    const scheduled = new Set(dailyOrder);
    const missing = songs
      .map((song) => song.themeNo)
      .filter((themeNo) => !scheduled.has(themeNo));

    // Run `npm run build:daily-order` after adding songs.
    expect(missing).toEqual([]);
  });

  it("deals the schedule in order", () => {
    expect(dailySong(1).themeNo).toBe(dailyOrder[0]);
    expect(dailySong(2).themeNo).toBe(dailyOrder[1]);
    expect(dailySong(dailyOrder.length).themeNo).toBe(
      dailyOrder[dailyOrder.length - 1]
    );
  });
});
