import { beforeEach, describe, expect, it } from "vitest";

import { DAILY_STORAGE_KEY, STORAGE_KEY } from "../constants/game";
import { Song } from "../types/song";
import { obscure } from "./obscure";
import { buildSaveFile, readSaveFile, saveFileName } from "./saveFile";
import { emptyGuesses, saveRounds } from "./storage";

const song: Song = {
  artist: "Mitsukiyo",
  name: "Constant Moderato",
  themeNo: "1",
};

function round(overrides: Record<string, unknown> = {}) {
  return {
    solution: song,
    currentTry: 1,
    didGuess: true,
    guesses: emptyGuesses(),
    startTime: 0,
    ...overrides,
  };
}

function file(contents: Record<string, unknown>): string {
  return obscure(JSON.stringify({ app: "baheardle", version: 1, ...contents }));
}

describe("save files", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("carries every mode's rounds there and back", () => {
    saveRounds([round({ day: 1 }), round({ day: 2 })], "daily");
    saveRounds([round()], "endless");

    const now = new Date("2026-09-28T10:00:00Z");
    const result = readSaveFile(buildSaveFile(now));

    expect(result).toEqual({
      ok: true,
      save: {
        exported: now.toISOString(),
        rounds: {
          daily: [round({ day: 1 }), round({ day: 2 })],
          endless: [round()],
          choice: [],
          timeattack: [],
        },
      },
    });
  });

  it("keeps the answer out of plain sight", () => {
    saveRounds([round()], "endless");
    expect(buildSaveFile()).not.toContain("Constant Moderato");
  });

  it("allows a trailing newline an editor might add", () => {
    saveRounds([round()], "endless");
    expect(readSaveFile(`${buildSaveFile()}\n`).ok).toBe(true);
  });

  it("turns away files that aren't saves", () => {
    for (const text of [
      "",
      "hello",
      obscure("not json"),
      obscure("[]"),
      file({ app: "something else" }),
      JSON.stringify({ app: "baheardle", version: 1 }),
    ]) {
      expect(readSaveFile(text)).toEqual({
        ok: false,
        error: "That file isn't a Blue Archive Heardle save.",
      });
    }
  });

  it("refuses a save from a newer game rather than half reading it", () => {
    const result = readSaveFile(
      file({ version: 2, rounds: { endless: [round()] } })
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("newer version");
  });

  it("drops damaged rounds and refuses a save with none left", () => {
    const result = readSaveFile(
      file({ rounds: { daily: [round(), { solution: 5 }], endless: "x" } })
    );
    expect(result).toEqual({
      ok: true,
      save: {
        exported: "",
        rounds: {
          daily: [round()],
          endless: [],
          choice: [],
          timeattack: [],
        },
      },
    });

    expect(readSaveFile(file({ rounds: { daily: [{}] } }))).toEqual({
      ok: false,
      error: "That save has no rounds in it.",
    });
  });

  it("leaves the date out when it can't be read", () => {
    const result = readSaveFile(
      file({ exported: "soon", rounds: { endless: [round()] } })
    );
    expect(result).toMatchObject({ ok: true, save: { exported: "" } });
  });

  it("names the file by the player's own date", () => {
    expect(saveFileName(new Date(2026, 8, 3, 23, 30))).toBe(
      "baheardle-save-2026-09-03.txt"
    );
  });

  it("exports nothing it wasn't given", () => {
    localStorage.setItem(STORAGE_KEY, "garbage");
    localStorage.setItem(DAILY_STORAGE_KEY, obscure("[]"));
    expect(readSaveFile(buildSaveFile())).toEqual({
      ok: false,
      error: "That save has no rounds in it.",
    });
  });
});
