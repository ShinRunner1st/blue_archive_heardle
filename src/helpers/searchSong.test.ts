import { describe, expect, it } from "vitest";

import { songs } from "../constants";
import { filterSongs, groupByArtist, searchSong } from "./searchSong";

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

describe("groupByArtist", () => {
  it("puts the biggest catalogues first and Unknown last", () => {
    const artists = groupByArtist(songs).map((group) => group.artist);

    expect(artists[0]).toBe("KARUT");
    expect(artists[1]).toBe("Mitsukiyo");
    expect(artists[artists.length - 1]).toBe("Unknown");
  });

  it("keeps the same order however far a filter narrows the list", () => {
    // One Mitsukiyo song against three KARUT ones would flip an ordering
    // based on the filtered results.
    const narrowed = [
      ...songs.filter((song) => song.artist === "Mitsukiyo").slice(0, 3),
      ...songs.filter((song) => song.artist === "KARUT").slice(0, 1),
    ];

    expect(groupByArtist(narrowed).map((group) => group.artist)).toEqual([
      "KARUT",
      "Mitsukiyo",
    ]);
  });

  it("keeps every song exactly once", () => {
    const grouped = groupByArtist(songs).flatMap((group) => group.songs);

    expect(grouped).toHaveLength(songs.length);
    expect(new Set(grouped).size).toBe(songs.length);
  });
});
