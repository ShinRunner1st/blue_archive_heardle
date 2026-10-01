import { beforeEach, describe, expect, it } from "vitest";

import { DAILY_STORAGE_KEY, STORAGE_KEY } from "../constants/game";
import { PICTURE_SLOTS } from "../types/picture";
import { Song } from "../types/song";
import { obscure, reveal } from "./obscure";
import {
  loadClearedMissions,
  loadRoomGames,
  loadRoomRecord,
  recordRoomGame,
  saveClearedMissions,
  saveRoomRecord,
} from "./missions";
import { isRoundId, withoutStamp } from "./roundId";
import {
  buildSaveFile,
  mergeMissions,
  readSaveFile,
  saveFileName,
} from "./saveFile";
import { upgradeSaves } from "./saveFormat";
import {
  emptyGuesses,
  loadRounds,
  savePictureRounds,
  saveRounds,
  saveStudentRounds,
  saveVoiceRounds,
} from "./storage";

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

const NO_VOICES = {
  daily: [],
  endless: [],
  nohint: [],
  choice: [],
  timeattack: [],
};

const NO_PICTURES = Object.fromEntries(PICTURE_SLOTS.map((slot) => [slot, []]));

const NO_SERVER = {
  students: {
    "gameplay-daily": [],
    "gameplay-endless": [],
    "lore-daily": [],
    "lore-endless": [],
  },
  voices: NO_VOICES,
  pictures: NO_PICTURES,
};

/** Rounds without the ids and times a file gives them, to compare. */
function bare<T>(value: T): T {
  if (Array.isArray(value)) return value.map(bare) as T;
  if (typeof value !== "object" || value === null) return value;
  return Object.fromEntries(
    Object.entries(withoutStamp(value)).map(([key, inner]) => [
      key,
      bare(inner),
    ])
  ) as T;
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

    expect(bare(result)).toEqual({
      ok: true,
      save: {
        exported: now.toISOString(),
        rounds: {
          daily: [round({ day: 1 }), round({ day: 2 })],
          endless: [round()],
          choice: [],
          timeattack: [],
        },
        ...NO_SERVER,
        jp: NO_SERVER,
        missions: [],
        roomRecord: { games: 0, wins: 0 },
        roomGames: [],
      },
    });
  });

  it("carries the student game's rounds too", () => {
    const rounds = [{ answer: 10005, guesses: [10000], day: 2 }];
    saveStudentRounds("lore-daily", rounds);

    const result = readSaveFile(buildSaveFile());
    expect(bare(result.ok && result.save.students["lore-daily"])).toEqual(
      rounds
    );
    expect(buildSaveFile()).not.toContain("10005");
  });

  it("carries Voice mode's rounds too", () => {
    const rounds = [{ answer: 10005, line: 2, guesses: [0, 10000], day: 2 }];
    saveVoiceRounds("daily", rounds);

    const result = readSaveFile(buildSaveFile());
    expect(bare(result.ok && result.save.voices.daily)).toEqual(rounds);
    expect(buildSaveFile()).not.toContain("10005");
  });

  it("carries the picture game's rounds too", () => {
    const rounds = [
      { answer: 10005, guesses: [0, 10000], day: 2 },
      { answer: 10010, guesses: [10010], run: 5, shape: true as const },
    ];
    savePictureRounds("weapon-daily", rounds);

    const result = readSaveFile(buildSaveFile());
    expect(bare(result.ok && result.save.pictures["weapon-daily"])).toEqual(
      rounds
    );
    expect(buildSaveFile()).not.toContain("10005");
  });

  it("reads a save from before the picture game, and one with only it", () => {
    const old = readSaveFile(file({ rounds: { endless: [round()] } }));
    expect(old.ok && old.save.pictures).toEqual(NO_PICTURES);

    const pictures = readSaveFile(
      file({ pictures: { "halo-choice": [{ answer: 1, guesses: [] }] } })
    );
    expect(pictures.ok && pictures.save.pictures["halo-choice"]).toHaveLength(
      1
    );
  });

  it("reads a save from before Voice mode, and one with only it", () => {
    const old = readSaveFile(file({ rounds: { endless: [round()] } }));
    expect(old.ok && old.save.voices).toEqual(NO_VOICES);

    const voices = readSaveFile(
      file({ voices: { nohint: [{ answer: 1, line: 0, guesses: [] }] } })
    );
    expect(voices.ok && voices.save.voices.nohint).toHaveLength(1);
  });

  it("reads a save from before the student game, and one with only it", () => {
    const old = readSaveFile(file({ rounds: { endless: [round()] } }));
    expect(old.ok && old.save.students["gameplay-endless"]).toEqual([]);

    const students = readSaveFile(
      file({ students: { "gameplay-endless": [{ answer: 1, guesses: [] }] } })
    );
    expect(students.ok).toBe(true);
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
      file({ version: 3, rounds: { endless: [round()] } })
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("newer version");
  });

  it("drops damaged rounds and refuses a save with none left", () => {
    const result = readSaveFile(
      file({ rounds: { daily: [round(), { solution: 5 }], endless: "x" } })
    );
    expect(bare(result)).toEqual({
      ok: true,
      save: {
        exported: "",
        rounds: {
          daily: [round()],
          endless: [],
          choice: [],
          timeattack: [],
        },
        ...NO_SERVER,
        jp: NO_SERVER,
        missions: [],
        roomRecord: { games: 0, wins: 0 },
        roomGames: [],
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

  it("carries the JP server's rounds apart from Global's", () => {
    const jpRound = { answer: 10149, guesses: [10149], day: 2 };
    saveStudentRounds("lore-daily", [jpRound], "jp");
    saveVoiceRounds("endless", [{ answer: 10150, line: 1, guesses: [] }], "jp");

    const result = readSaveFile(buildSaveFile());

    expect(bare(result.ok && result.save.jp.students["lore-daily"])).toEqual([
      jpRound,
    ]);
    expect(result.ok && result.save.jp.voices.endless).toHaveLength(1);
    expect(result.ok && result.save.students["lore-daily"]).toEqual([]);
  });

  it("reads an older file, with no JP rounds, as JP starting fresh", () => {
    const result = readSaveFile(file({ rounds: { endless: [round()] } }));

    expect(result.ok && result.save.jp).toEqual(NO_SERVER);
  });

  it("carries the missions cleared and the multiplayer record", () => {
    saveRounds([round()], "endless");
    saveClearedMissions(["jp", "room-first"]);
    saveRoomRecord({ games: 3, wins: 1 });
    const result = readSaveFile(buildSaveFile());
    expect(result).toMatchObject({
      ok: true,
      save: {
        missions: ["jp", "room-first"],
        roomRecord: { games: 3, wins: 1 },
      },
    });
  });

  it("merges missions in, never adding a game twice", () => {
    saveClearedMissions(["jp"]);
    saveRoomRecord({ games: 5, wins: 0 });
    saveRounds([round()], "endless");
    const result = readSaveFile(buildSaveFile());
    if (!result.ok) throw new Error(result.error);

    saveClearedMissions(["birthday"]);
    saveRoomRecord({ games: 2, wins: 1 });
    mergeMissions(result.save);
    expect(loadClearedMissions().sort()).toEqual(["birthday", "jp"]);
    expect(loadRoomRecord()).toEqual({ games: 5, wins: 1 });
  });

  it("gives every round an id, the same each time for an old one", () => {
    saveRounds([round({ day: 1 }), round({ day: 2 })], "daily");
    saveStudentRounds("lore-endless", [{ answer: 10005, guesses: [10005] }]);

    const first = readSaveFile(buildSaveFile());
    const again = readSaveFile(buildSaveFile());
    if (!first.ok || !again.ok) throw new Error("not read");
    const ids = first.save.rounds.daily.map((each) => each.id);
    expect(ids.every(isRoundId)).toBe(true);
    expect(new Set(ids).size).toBe(2);
    expect(again.save.rounds.daily.map((each) => each.id)).toEqual(ids);
    expect(isRoundId(first.save.students["lore-endless"][0].id)).toBe(true);
  });

  it("reads a version 1 file's rounds with the ids its browser gives them", () => {
    const daily = [round({ day: 1 }), round({ day: 2 })];
    const old = readSaveFile(file({ rounds: { daily } }));

    saveRounds(daily, "daily");
    upgradeSaves();
    const here = loadRounds("daily").map((each) => each.id);

    expect(old.ok && old.save.rounds.daily.map((each) => each.id)).toEqual(
      here
    );
  });

  it("keeps a round's own id and time", () => {
    saveRounds([round({ id: "0123456789ab", at: 1000 })], "endless");
    const result = readSaveFile(buildSaveFile());
    expect(result.ok && result.save.rounds.endless[0]).toMatchObject({
      id: "0123456789ab",
      at: 1000,
    });
  });

  it("writes a song as its theme number, and the tries used only", () => {
    const guessed = emptyGuesses();
    guessed[0] = {
      song: { ...song, themeNo: "2" },
      skipped: false,
      isCorrect: false,
    };
    guessed[1] = { song: undefined, skipped: true, isCorrect: undefined };
    guessed[2] = { song, skipped: false, isCorrect: true };
    saveRounds([round({ guesses: guessed, currentTry: 3 })], "endless");

    const text = buildSaveFile();
    const json = JSON.parse(reveal(text)!);
    expect(json.version).toBe(2);
    expect(json.rounds.endless[0].solution).toBe("1");
    expect(json.rounds.endless[0].guesses).toEqual([
      ["2", false],
      1,
      ["1", true],
    ]);

    const result = readSaveFile(text);
    if (!result.ok) throw new Error(result.error);
    const back = result.save.rounds.endless[0];
    expect(back.solution.themeNo).toBe("1");
    expect(back.guesses).toHaveLength(6);
    expect(back.guesses[0].song?.themeNo).toBe("2");
    expect(back.guesses[1].skipped).toBe(true);
    expect(back.guesses[2].isCorrect).toBe(true);
    expect(back.guesses[3]).toEqual({
      song: undefined,
      skipped: false,
      isCorrect: undefined,
    });
  });

  it("drops a version 2 round whose song the game doesn't have", () => {
    const result = readSaveFile(
      obscure(
        JSON.stringify({
          app: "baheardle",
          version: 2,
          rounds: {
            endless: [
              { ...round(), solution: "1", guesses: [] },
              { ...round(), solution: "no such song", guesses: [] },
            ],
          },
        })
      )
    );
    expect(result.ok && result.save.rounds.endless).toHaveLength(1);
  });

  it("carries multiplayer games one by one, never adding one twice", () => {
    saveRounds([round()], "endless");
    saveRoomRecord({ games: 4, wins: 1 });
    recordRoomGame(true, 5000);
    const result = readSaveFile(buildSaveFile());
    if (!result.ok) throw new Error(result.error);
    expect(result.save.roomRecord).toEqual({ games: 4, wins: 1 });
    expect(result.save.roomGames).toMatchObject([{ at: 5000, won: true }]);

    // The same file in again, and another game here meanwhile.
    recordRoomGame(false, 6000);
    mergeMissions(result.save);
    expect(loadRoomGames()).toHaveLength(2);
    expect(loadRoomRecord()).toEqual({ games: 6, wins: 2 });
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
