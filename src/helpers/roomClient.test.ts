import { beforeEach, describe, expect, it } from "vitest";

import { ROOM_PRESETS_KEY } from "../constants/game";
import { DEFAULT_ROOM_SETTINGS } from "../types/room";
import {
  backToken,
  deleteRoomPreset,
  keepBackToken,
  loadQuickAnswer,
  loadRoomName,
  loadRoomPresets,
  MAX_PRESETS,
  presetCode,
  readPresetCode,
  saveQuickAnswer,
  saveRoomName,
  saveRoomPreset,
} from "./roomClient";

beforeEach(() => localStorage.clear());

describe("room presets", () => {
  it("keeps settings by name, the newest first, replacing one of the same name", () => {
    saveRoomPreset({ name: "Quick OST", settings: DEFAULT_ROOM_SETTINGS });
    saveRoomPreset({
      name: "Voice night",
      settings: { ...DEFAULT_ROOM_SETTINGS, game: "voice" },
    });
    const kept = saveRoomPreset({
      name: " Quick   OST ",
      settings: { ...DEFAULT_ROOM_SETTINGS, rounds: 5 },
    });
    expect(kept.map((p) => p.name)).toEqual(["Quick OST", "Voice night"]);
    expect(loadRoomPresets()[0].settings.rounds).toBe(5);
    expect(deleteRoomPreset("Voice night").map((p) => p.name)).toEqual([
      "Quick OST",
    ]);
  });

  it("keeps only a few, and drops any that don't check out", () => {
    for (let i = 0; i < MAX_PRESETS + 2; i++) {
      saveRoomPreset({
        name: `Room ${i}`,
        settings: { ...DEFAULT_ROOM_SETTINGS, rounds: 5 + i },
      });
    }
    expect(loadRoomPresets()).toHaveLength(MAX_PRESETS);
    localStorage.setItem(
      ROOM_PRESETS_KEY,
      JSON.stringify([
        { name: "Bad", settings: { ...DEFAULT_ROOM_SETTINGS, rounds: 999 } },
        { name: "", settings: DEFAULT_ROOM_SETTINGS },
        { name: "Good", settings: DEFAULT_ROOM_SETTINGS },
      ])
    );
    expect(loadRoomPresets().map((p) => p.name)).toEqual(["Good"]);
  });

  it("renames the preset already holding the same settings", () => {
    saveRoomPreset({ name: "Quick OST", settings: DEFAULT_ROOM_SETTINGS });
    saveRoomPreset({
      name: "Voice night",
      settings: { ...DEFAULT_ROOM_SETTINGS, game: "voice" },
    });
    const kept = saveRoomPreset({
      name: "Friday",
      settings: DEFAULT_ROOM_SETTINGS,
    });
    expect(kept.map((p) => p.name)).toEqual(["Friday", "Voice night"]);
  });

  it("goes to a friend as a short code, checked as it comes in", () => {
    const preset = {
      name: "Halo night. 2",
      settings: {
        ...DEFAULT_ROOM_SETTINGS,
        game: "picture" as const,
        silhouette: true,
        server: "jp" as const,
      },
    };
    const code = presetCode(preset);
    expect(code.length).toBeLessThan(80);
    expect(
      readPresetCode(`  ${code}
`)
    ).toEqual(preset);
    expect(readPresetCode(code.replace(".jp.", ".mars."))).toBeNull();
    expect(readPresetCode("BA1.ost")).toBeNull();
    expect(readPresetCode("hello")).toBeNull();
    // A name lost in the paste: the settings still come in.
    expect(
      readPresetCode(code.split(".").slice(0, 12).join(".") + ".")
    ).toEqual({ name: "Imported", settings: preset.settings });
  });

  it("keeps a room's albums and lines in its code", () => {
    const preset = {
      name: "Vol mix",
      settings: {
        ...DEFAULT_ROOM_SETTINGS,
        albums: [1, 3],
        lines: "titles" as const,
      },
    };
    expect(readPresetCode(presetCode(preset))).toEqual(preset);
    expect(
      readPresetCode(presetCode(preset).replace(".1-3.", ".1-99."))
    ).toBeNull();
  });

  it("still reads a code from before the albums", () => {
    expect(
      readPresetCode("BA1.voice.choice.12.15.random.halo.0.6.global.Old")
    ).toEqual({
      name: "Old",
      settings: {
        ...DEFAULT_ROOM_SETTINGS,
        game: "voice",
        answers: "choice",
        rounds: 12,
        guessSeconds: 15,
        maxPlayers: 6,
      },
    });
  });
});

describe("the token a closed tab leaves", () => {
  it("is kept a few hours per room, for the browser's next tab", () => {
    keepBackToken("ABCD", "token-one", 1000);
    expect(backToken("ABCD", 2000)).toBe("token-one");
    expect(backToken("EFGH", 2000)).toBeUndefined();
    expect(backToken("ABCD", 1000 + 4 * 60 * 60_000)).toBeUndefined();
  });

  it("keeps only the latest rooms", () => {
    const codes = ["AAAA", "BBBB", "CCCC", "DDDD", "EEEE", "FFFF", "GGGG"];
    [...codes, "HHHH", "JJJJ"].forEach((code, i) =>
      keepBackToken(code, `token-${code}`, 1000 + i)
    );
    expect(backToken("AAAA", 2000)).toBeUndefined();
    expect(backToken("JJJJ", 2000)).toBe("token-JJJJ");
  });
});

it("remembers the name typed for a room, but not an empty one", () => {
  expect(loadRoomName()).toBe("");
  saveRoomName("  Nonomi ");
  saveRoomName("   ");
  expect(loadRoomName()).toBe("Nonomi");
});

it("remembers Quick answer", () => {
  expect(loadQuickAnswer()).toBe(false);
  saveQuickAnswer(true);
  expect(loadQuickAnswer()).toBe(true);
  saveQuickAnswer(false);
  expect(loadQuickAnswer()).toBe(false);
});
