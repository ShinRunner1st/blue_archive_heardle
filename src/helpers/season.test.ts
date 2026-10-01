import { afterEach, describe, expect, it, vi } from "vitest";

import { pictureFiles } from "../constants/pictureFiles";
import { SEASONS } from "../constants/seasons";
import { homeName, homePicture, pictureUrl, seasonOn } from "./season";

afterEach(() => {
  vi.unstubAllEnvs();
  window.history.replaceState(null, "", "/");
});

/** Noon local time, well clear of midnight in any timezone test. */
const on = (month: number, day: number, year = 2026) =>
  new Date(year, month - 1, day, 12);

const idOn = (month: number, day: number, year?: number) =>
  seasonOn(on(month, day, year))?.id ?? null;

describe("seasonOn", () => {
  it("is Christmas from 18 to 26 December", () => {
    expect(idOn(12, 17)).toBeNull();
    expect(idOn(12, 18)).toBe("christmas");
    expect(idOn(12, 25)).toBe("christmas");
    expect(idOn(12, 26)).toBe("christmas");
    expect(idOn(12, 27)).toBeNull();
  });

  it("is New Year from 31 December to 7 January, across the year's end", () => {
    expect(idOn(12, 30)).toBeNull();
    expect(idOn(12, 31)).toBe("new-year");
    expect(idOn(1, 1, 2027)).toBe("new-year");
    expect(idOn(1, 7, 2027)).toBe("new-year");
    expect(idOn(1, 8, 2027)).toBeNull();
  });

  it("has a season for each time of year, on its dates", () => {
    expect(idOn(1, 31)).toBeNull();
    expect(idOn(2, 4)).toBe("jp-anniversary");
    expect(idOn(2, 14)).toBe("valentine");
    expect(idOn(2, 15)).toBeNull();
    expect(idOn(3, 24)).toBeNull();
    expect(idOn(4, 1)).toBe("cherry-blossom");
    expect(idOn(4, 11)).toBeNull();
    expect(idOn(7, 15)).toBe("beach");
    expect(idOn(8, 11)).toBe("summer-festival");
    expect(idOn(8, 26)).toBeNull();
    expect(idOn(10, 31)).toBe("halloween");
    expect(idOn(11, 1)).toBeNull();
    expect(idOn(11, 8)).toBe("global-anniversary");
    expect(idOn(11, 13)).toBe("autumn");
    expect(idOn(12, 1)).toBeNull();
  });

  it("never has two seasons on one day", () => {
    for (let day = 0; day < 366; day++) {
      const date = new Date(2028, 0, 1 + day, 12);
      const month = date.getMonth() + 1;
      const today = month * 100 + date.getDate();
      const matches = SEASONS.filter(({ from, to }) => {
        const start = from[0] * 100 + from[1];
        const end = to[0] * 100 + to[1];
        return start <= end
          ? today >= start && today <= end
          : today >= start || today <= end;
      });
      expect(matches.length, date.toDateString()).toBeLessThanOrEqual(1);
    }
  });

  it("is no season the rest of the year", () => {
    expect(idOn(9, 28)).toBeNull();
    expect(idOn(6, 15)).toBeNull();
    expect(idOn(2, 29, 2028)).toBeNull();
  });

  it("goes by the player's own calendar", () => {
    // Late on Christmas Eve here, whatever the date is in UTC.
    expect(seasonOn(new Date(2026, 11, 24, 23, 59))?.id).toBe("christmas");
  });

  it("can be shown on any day while developing, to check how it looks", () => {
    window.history.replaceState(null, "", "/?season=new-year");
    expect(idOn(9, 28)).toBe(import.meta.env.DEV ? "new-year" : null);
  });

  it("gives every season an id of its own", () => {
    const ids = SEASONS.map((season) => season.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("season pictures", () => {
  it("has both pictures of every season on the Worker", () => {
    for (const season of SEASONS) {
      expect(pictureFiles[season.day]).toMatch(/^pictures\/[\w.-]+\.webp$/);
      expect(pictureFiles[season.night]).toMatch(/^pictures\/[\w.-]+\.webp$/);
    }
  });

  it("serves them from the Worker, like the audio", () => {
    vi.stubEnv("VITE_AUDIO_BASE_URL", "https://audio.example.com");
    expect(pictureUrl("seasons/christmas-day")).toBe(
      `https://audio.example.com/${pictureFiles["seasons/christmas-day"]}`
    );
  });

  it("dresses the home picture by day or by night", () => {
    vi.stubEnv("VITE_AUDIO_BASE_URL", "");
    const christmas = SEASONS.find(({ id }) => id === "christmas")!;
    expect(homePicture(christmas, "light", "library.webp")).toBe(
      `/audio/${pictureFiles[christmas.day]}`
    );
    expect(homePicture(christmas, "dark", "library.webp")).toBe(
      `/audio/${pictureFiles[christmas.night]}`
    );
  });

  it("keeps the scheme's own picture out of season", () => {
    expect(homePicture(null, "dark", "library.webp")).toBe("library.webp");
  });
});

describe("homeName", () => {
  it("names the season's home, or the library out of season", () => {
    expect(homeName(seasonOn(on(12, 25)))).toBe("the Christmas lodge");
    expect(homeName(null)).toBe("the Trinity library");
  });
});
