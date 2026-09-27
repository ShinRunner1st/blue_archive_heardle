import { describe, expect, it } from "vitest";

import { songs } from "../constants";
import { VOLUMES } from "../constants/volumes";
import { ALBUM_FILTERS, albumCount, jukeboxSongs } from "./jukebox";

const themes = (list: { themeNo: string }[]) => list.map((s) => s.themeNo);

describe("jukeboxSongs", () => {
  it("lists every song, in theme order, with nothing picked", () => {
    expect(jukeboxSongs("", [])).toHaveLength(songs.length);
    expect(jukeboxSongs("", [])[0].themeNo).toBe("1");
  });

  it("searches by name, artist or theme number, like All OST", () => {
    expect(themes(jukeboxSongs("constant mod", []))).toContain("1");
    expect(
      jukeboxSongs("karut", []).every((song) => song.artist === "KARUT")
    ).toBe(true);
    expect(themes(jukeboxSongs("39", []))).toContain("39");
  });

  it("narrows to the albums picked, any of them", () => {
    const vol1 = jukeboxSongs("", ["vol1"]);
    expect(vol1).toHaveLength(VOLUMES[0].songs.length);

    const both = jukeboxSongs("", ["vol1", "vol2"]);
    // Water Drop is on both albums, and is listed once.
    expect(both).toHaveLength(
      new Set([...VOLUMES[0].songs, ...VOLUMES[1].songs]).size
    );
  });

  it("keeps album songs off the Other chip", () => {
    const other = themes(jukeboxSongs("", ["other"]));
    const onAlbums = new Set(VOLUMES.flatMap((volume) => volume.songs));

    expect(other.length).toBeGreaterThan(0);
    expect(other.some((theme) => onAlbums.has(theme))).toBe(false);
  });

  it("puts every song under one chip or another", () => {
    const total = new Set(
      ALBUM_FILTERS.flatMap((filter) => themes(jukeboxSongs("", [filter.id])))
    );
    expect(total.size).toBe(songs.length);
  });

  it("counts each chip's songs", () => {
    expect(albumCount(ALBUM_FILTERS[0])).toBe(VOLUMES[0].songs.length);
  });
});
