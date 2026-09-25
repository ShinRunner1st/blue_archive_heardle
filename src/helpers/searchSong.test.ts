import { describe, expect, it } from "vitest";

import { songs } from "../constants";
import { artists, filterSongs, searchSong } from "./searchSong";

describe("searchSong", () => {
  it("returns nothing for a blank term", () => {
    expect(searchSong("")).toEqual([]);
    expect(searchSong("   ")).toEqual([]);
  });

  it("matches on song name, case insensitively", () => {
    const results = searchSong("constant moderato");

    expect(results[0].name).toBe("Constant Moderato");
  });

  it("matches on artist", () => {
    const results = searchSong("mitsukiyo");

    expect(results.length).toBeGreaterThan(0);
    expect(results.every((song) => song.artist === "Mitsukiyo")).toBe(true);
  });

  it("matches on theme number", () => {
    expect(searchSong("1").some((song) => song.themeNo === "1")).toBe(true);
  });

  it("caps the result list at six", () => {
    expect(searchSong("a").length).toBeLessThanOrEqual(6);
  });

  it("sorts numerically rather than lexically", () => {
    const themeNos = searchSong("mitsukiyo").map((song) =>
      Number(song.themeNo)
    );
    const sorted = [...themeNos].sort((a, b) => a - b);

    expect(themeNos).toEqual(sorted);
  });
});

describe("song data", () => {
  it("has no duplicate theme numbers", () => {
    const themeNos = songs.map((song) => song.themeNo);

    expect(new Set(themeNos).size).toBe(themeNos.length);
  });

  it("has every field populated", () => {
    const incomplete = songs.filter(
      (song) => !song.artist || !song.name || !song.themeNo
    );

    expect(incomplete).toEqual([]);
  });
});

describe("filterSongs", () => {
  it("returns every song for a blank term, in theme order", () => {
    const all = filterSongs("  ");

    expect(all).toHaveLength(songs.length);
    expect(all[0].themeNo).toBe("1");
    expect(Number(all[1].themeNo)).toBeGreaterThan(Number(all[0].themeNo));
  });

  it("is not capped like the search suggestions", () => {
    const karut = filterSongs("karut");

    expect(karut.length).toBeGreaterThan(6);
    expect(karut.every((song) => song.artist === "KARUT")).toBe(true);
  });
});

describe("filterSongs by artist", () => {
  it("keeps only that artist's songs", () => {
    const nor = filterSongs("", "Nor");

    expect(nor.length).toBeGreaterThan(0);
    expect(nor.every((song) => song.artist === "Nor")).toBe(true);
  });

  it("combines with the search term", () => {
    const both = filterSongs("constant", "Mitsukiyo");

    expect(both.length).toBeGreaterThan(0);
    expect(filterSongs("constant", "KARUT")).toEqual([]);
  });
});

describe("artists", () => {
  it("puts the biggest catalogues first and Unknown last", () => {
    const names = artists.map((entry) => entry.artist);

    expect(names[0]).toBe("KARUT");
    expect(names[1]).toBe("Mitsukiyo");
    expect(names[names.length - 1]).toBe("Unknown");
  });

  it("counts every song exactly once", () => {
    const total = artists.reduce((sum, entry) => sum + entry.count, 0);

    expect(total).toBe(songs.length);
    expect(new Set(artists.map((entry) => entry.artist)).size).toBe(
      artists.length
    );
  });
});
