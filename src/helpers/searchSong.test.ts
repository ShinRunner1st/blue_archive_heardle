import { describe, expect, it } from "vitest";

import { songs } from "../constants";
import { searchSong } from "./searchSong";

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

  it("has no duplicate YouTube ids", () => {
    const ids = songs.map((song) => song.youtubeId);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has every field populated", () => {
    const incomplete = songs.filter(
      (song) => !song.artist || !song.name || !song.youtubeId || !song.themeNo
    );

    expect(incomplete).toEqual([]);
  });
});
