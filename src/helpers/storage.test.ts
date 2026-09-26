import { beforeEach, describe, expect, it, vi } from "vitest";

import { MODE_KEY, STORAGE_KEY } from "../constants/game";
import {
  emptyGuesses,
  hasSeenWhatsNew,
  loadMode,
  loadRounds,
  markWhatsNewSeen,
  saveMode,
  saveRounds,
} from "./storage";
import { Song } from "../types/song";

const song: Song = {
  artist: "Mitsukiyo",
  name: "Constant Moderato",
  themeNo: "1",
};

function round(overrides: Record<string, unknown> = {}) {
  return {
    solution: song,
    currentTry: 0,
    didGuess: false,
    guesses: emptyGuesses(),
    startTime: 0,
    ...overrides,
  };
}

describe("loadRounds", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns an empty array when nothing is stored", () => {
    expect(loadRounds()).toEqual([]);
  });

  it("returns an empty array for malformed JSON instead of throwing", () => {
    localStorage.setItem(STORAGE_KEY, "{not json");
    expect(loadRounds()).toEqual([]);
  });

  it("returns an empty array when the stored value is not an array", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ solution: song }));
    expect(loadRounds()).toEqual([]);
  });

  it("drops entries with no usable solution", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([round(), { solution: null }, "nonsense"])
    );

    expect(loadRounds()).toHaveLength(1);
  });

  it("keeps a round whose song is no longer in the song list", () => {
    const removed = { ...song, themeNo: "9999" };
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([round({ solution: removed })])
    );

    // The stored entry carries every field needed to display it, so history
    // survives edits to songs.ts instead of white-screening the app.
    expect(loadRounds()[0].solution).toEqual(removed);
  });

  it("keeps saves from the YouTube version, which stored a youtubeId", () => {
    const youtubeEra = { ...song, youtubeId: "dQw4w9WgXcQ" };
    const guesses = emptyGuesses();
    guesses[0] = { song: youtubeEra, skipped: false, isCorrect: true };
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([
        round({ solution: youtubeEra, guesses, didGuess: true, currentTry: 1 }),
      ])
    );

    // Every player upgrading from the YouTube build has this shape saved, so
    // the leftover field must not make their history look corrupt.
    const [loaded] = loadRounds();
    expect(loaded.solution.themeNo).toBe("1");
    expect(loaded.didGuess).toBe(true);
    expect(loaded.guesses[0].song?.name).toBe("Constant Moderato");
  });

  it("backfills fields missing from older saves", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([{ solution: song }]));

    const [loaded] = loadRounds();
    expect(loaded.currentTry).toBe(0);
    expect(loaded.didGuess).toBe(false);
    // null means "no clip window rolled yet", distinct from a rolled 0.
    expect(loaded.startTime).toBeNull();
    expect(loaded.guesses).toHaveLength(6);
  });

  it("clamps an out-of-range currentTry", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([round({ currentTry: 99 })])
    );

    expect(loadRounds()[0].currentTry).toBe(6);
  });

  it("survives localStorage throwing", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });

    expect(loadRounds()).toEqual([]);
  });
});

describe("saveRounds", () => {
  it("does not throw when storage is unavailable", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota exceeded");
    });

    expect(() => saveRounds([round()])).not.toThrow();
  });
});

describe("emptyGuesses", () => {
  it("gives every slot its own object", () => {
    const guesses = emptyGuesses();

    expect(guesses).toHaveLength(6);
    expect(guesses[0]).not.toBe(guesses[1]);
  });
});

describe("What's new", () => {
  beforeEach(() => localStorage.clear());

  it("is unseen until marked, and again once the id changes", () => {
    expect(hasSeenWhatsNew("a")).toBe(false);

    markWhatsNewSeen("a");
    expect(hasSeenWhatsNew("a")).toBe(true);
    expect(hasSeenWhatsNew("b")).toBe(false);
  });
});

describe("loadMode", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("honours a stored preference", () => {
    saveMode("endless");
    expect(loadMode()).toBe("endless");

    saveMode("daily");
    expect(loadMode()).toBe("daily");
  });

  it("starts a brand-new player on the daily puzzle", () => {
    expect(loadMode()).toBe("daily");
  });

  /**
   * Someone who played before daily mode existed has an endless history and no
   * stored mode. Landing them on daily would show a score of 0/0 and read as
   * though their run had been wiped.
   */
  it("leaves a returning player where they left off", () => {
    saveRounds([round({ didGuess: true, currentTry: 2 })]);

    expect(loadMode()).toBe("endless");
  });

  it("ignores a junk value rather than trusting it", () => {
    localStorage.setItem(MODE_KEY, "sideways");

    expect(loadMode()).toBe("daily");
  });
});
