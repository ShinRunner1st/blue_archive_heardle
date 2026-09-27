import { describe, expect, it } from "vitest";

import { songs } from "../constants";
import { VOLUMES } from "../constants/volumes";
import { jukeboxShelves } from "./jukebox";

describe("jukeboxShelves", () => {
  const shelves = jukeboxShelves();

  it("has a shelf per album, in order, then Other", () => {
    expect(shelves.map((shelf) => shelf.label)).toEqual([
      ...VOLUMES.map((volume) => `Vol.${volume.number}`),
      "Other",
    ]);
  });

  it("holds every song in the game", () => {
    const held = new Set(
      shelves.flatMap((shelf) => shelf.songs.map((song) => song.themeNo))
    );

    expect(held.size).toBe(songs.length);
  });

  it("puts a song on both albums it is on", () => {
    const withWaterDrop = shelves.filter((shelf) =>
      shelf.songs.some((song) => song.themeNo === "39")
    );

    expect(withWaterDrop.map((shelf) => shelf.label)).toEqual([
      "Vol.1",
      "Vol.2",
    ]);
  });

  it("keeps album songs off the Other shelf", () => {
    const other = shelves[shelves.length - 1];

    expect(other.songs.some((song) => song.themeNo === "1")).toBe(false);
  });
});
