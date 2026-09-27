import { describe, expect, it } from "vitest";

import { songs } from "../constants";
import { CHOICE_COUNT, choiceSongs, makeChoices } from "./choices";

/** A steady run of numbers, so a draw can be repeated. */
function seeded(seed: number) {
  let state = seed;
  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
}

describe("makeChoices", () => {
  it("offers four different songs, the answer among them", () => {
    for (let seed = 1; seed <= 50; seed += 1) {
      const answer = songs[(seed * 7) % songs.length];
      const choices = makeChoices(answer, seeded(seed));

      expect(choices).toHaveLength(CHOICE_COUNT);
      expect(new Set(choices).size).toBe(CHOICE_COUNT);
      expect(choices).toContain(answer.themeNo);
    }
  });

  it("picks wrong answers that sound close: same artist or nearby", () => {
    const answer = songs[100];
    const index = (theme: string) =>
      songs.findIndex((song) => song.themeNo === theme);

    for (let seed = 1; seed <= 50; seed += 1) {
      const wrong = makeChoices(answer, seeded(seed)).filter(
        (theme) => theme !== answer.themeNo
      );

      for (const theme of wrong) {
        const song = songs[index(theme)];
        const near = Math.abs(index(theme) - 100) < 12;
        expect(near || song.artist === answer.artist).toBe(true);
      }
    }
  });

  it("doesn't treat uncredited tracks as one artist", () => {
    const answer = songs.find((song) => song.artist === "Unknown")!;
    const index = (theme: string) =>
      songs.findIndex((song) => song.themeNo === theme);
    const at = index(answer.themeNo);

    for (let seed = 1; seed <= 30; seed += 1) {
      for (const theme of makeChoices(answer, seeded(seed))) {
        expect(Math.abs(index(theme) - at)).toBeLessThan(12);
      }
    }
  });

  it("doesn't always put the answer in the same place", () => {
    const places = new Set(
      Array.from({ length: 40 }, (_, seed) =>
        makeChoices(songs[50], seeded(seed + 1)).indexOf(songs[50].themeNo)
      )
    );

    expect(places.size).toBe(CHOICE_COUNT);
  });

  it("still finds four at either end of the list", () => {
    for (const answer of [songs[0], songs[songs.length - 1]]) {
      const choices = makeChoices(answer, seeded(3));
      expect(new Set(choices).size).toBe(CHOICE_COUNT);
    }
  });
});

describe("choiceSongs", () => {
  it("turns theme numbers back into songs, skipping unknown ones", () => {
    expect(choiceSongs(["1", "nope", "2"]).map((song) => song.name)).toEqual([
      "Constant Moderato",
      "Luminous memory",
    ]);
  });
});
