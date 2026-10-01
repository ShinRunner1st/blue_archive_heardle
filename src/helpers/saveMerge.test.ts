import { describe, expect, it } from "vitest";

import { PICTURE_SLOTS } from "../types/picture";
import { Round } from "../types/stats";
import { StudentRound } from "../types/student";
import { VoiceRound } from "../types/voice";
import { SaveFile, ServerSave } from "./saveFile";
import { mergeSaves } from "./saveMerge";
import { emptyGuesses } from "./storage";

const song = { artist: "Mitsukiyo", name: "Constant Moderato", themeNo: "1" };

function ost(id: string, overrides: Partial<Round> = {}): Round {
  return {
    id,
    solution: song,
    currentTry: 1,
    didGuess: true,
    guesses: emptyGuesses(),
    startTime: 0,
    ...overrides,
  };
}

const student = (
  id: string,
  overrides: Partial<StudentRound> = {}
): StudentRound => ({ id, answer: 10005, guesses: [10005], ...overrides });

const voice = (
  id: string,
  overrides: Partial<VoiceRound> = {}
): VoiceRound => ({
  id,
  answer: 10005,
  line: 0,
  guesses: [10005],
  ...overrides,
});

function server(overrides: Partial<ServerSave> = {}): ServerSave {
  return {
    students: {
      "gameplay-daily": [],
      "gameplay-endless": [],
      "lore-daily": [],
      "lore-endless": [],
    },
    voices: { daily: [], endless: [], nohint: [], choice: [], timeattack: [] },
    pictures: Object.fromEntries(
      PICTURE_SLOTS.map((slot) => [slot, []])
    ) as unknown as ServerSave["pictures"],
    ...overrides,
  };
}

function save(overrides: Partial<SaveFile> = {}): SaveFile {
  return {
    exported: "",
    rounds: { daily: [], endless: [], choice: [], timeattack: [] },
    ...server(),
    jp: server(),
    missions: [],
    roomRecord: { games: 0, wins: 0 },
    roomGames: [],
    ...overrides,
  };
}

const ids = (rounds: Array<{ id?: string }>) => rounds.map((r) => r.id);

describe("mergeSaves", () => {
  it("keeps every round from both, a round on both sides once", () => {
    const a = save({
      rounds: {
        daily: [],
        endless: [ost("a1", { at: 1 }), ost("both", { at: 2 })],
        choice: [],
        timeattack: [],
      },
    });
    const b = save({
      rounds: {
        daily: [],
        endless: [ost("both", { at: 2 }), ost("b1", { at: 3 })],
        choice: [],
        timeattack: [],
      },
    });
    expect(ids(mergeSaves(a, b).rounds.endless)).toEqual(["a1", "both", "b1"]);
  });

  it("orders rounds by when they were dealt, old ones first", () => {
    const a = save({
      rounds: {
        daily: [],
        endless: [ost("lold-a"), ost("a", { at: 30 })],
        choice: [],
        timeattack: [],
      },
    });
    const b = save({
      rounds: {
        daily: [],
        endless: [ost("lold-b"), ost("b", { at: 20 })],
        choice: [],
        timeattack: [],
      },
    });
    expect(ids(mergeSaves(a, b).rounds.endless)).toEqual([
      "lold-a",
      "lold-b",
      "b",
      "a",
    ]);
  });

  it("keeps the copy of a round played further", () => {
    const open = student("same", { guesses: [10000], at: 5 });
    const done = student("same", { guesses: [10000, 10005], at: 5 });
    const a = save({
      students: { ...server().students, "lore-endless": [open] },
    });
    const b = save({
      students: { ...server().students, "lore-endless": [done] },
    });
    expect(mergeSaves(a, b).students["lore-endless"]).toEqual([done]);
    expect(mergeSaves(b, a).students["lore-endless"]).toEqual([done]);
  });

  it("keeps one daily puzzle a day: the finished one, else the first dealt", () => {
    const unfinished = voice("open", { day: 3, guesses: [], at: 1 });
    const finished = voice("done", { day: 3, at: 9 });
    const early = voice("early", { day: 4, at: 10 });
    const late = voice("late", { day: 4, at: 20 });
    const a = save({
      voices: { ...server().voices, daily: [unfinished, late] },
    });
    const b = save({
      voices: { ...server().voices, daily: [finished, early] },
    });
    expect(ids(mergeSaves(a, b).voices.daily)).toEqual(["done", "early"]);
  });

  it("keeps base's daily when the two can't be told apart", () => {
    const a = save({
      rounds: {
        daily: [ost("lmine", { day: 2 })],
        endless: [],
        choice: [],
        timeattack: [],
      },
    });
    const b = save({
      rounds: {
        daily: [ost("ltheirs", { day: 2 })],
        endless: [],
        choice: [],
        timeattack: [],
      },
    });
    expect(ids(mergeSaves(a, b).rounds.daily)).toEqual(["lmine"]);
  });

  it("keeps the JP server's rounds apart", () => {
    const a = save({
      jp: server({
        students: { ...server().students, "gameplay-endless": [student("j")] },
      }),
    });
    const merged = mergeSaves(a, save());
    expect(ids(merged.jp.students["gameplay-endless"])).toEqual(["j"]);
    expect(merged.students["gameplay-endless"]).toEqual([]);
  });

  it("joins missions and multiplayer games, the old counts at the larger", () => {
    const a = save({
      missions: ["jp", "birthday"],
      roomRecord: { games: 5, wins: 0 },
      roomGames: [{ id: "g1", at: 1, won: true }],
    });
    const b = save({
      missions: ["birthday", "room-first"],
      roomRecord: { games: 2, wins: 1 },
      roomGames: [
        { id: "g1", at: 1, won: true },
        { id: "g2", at: 2, won: false },
      ],
    });
    const merged = mergeSaves(a, b);
    expect(merged.missions).toEqual(["jp", "birthday", "room-first"]);
    expect(merged.roomRecord).toEqual({ games: 5, wins: 1 });
    expect(ids(merged.roomGames)).toEqual(["g1", "g2"]);
  });

  it("changes neither copy, and gives the same twice over", () => {
    const a = save({
      rounds: {
        daily: [],
        endless: [ost("a1", { at: 1 })],
        choice: [],
        timeattack: [],
      },
    });
    const b = save({
      rounds: {
        daily: [],
        endless: [ost("b1", { at: 2 })],
        choice: [],
        timeattack: [],
      },
    });
    const before = JSON.stringify([a, b]);
    const once = mergeSaves(a, b);
    expect(JSON.stringify([a, b])).toBe(before);
    expect(mergeSaves(once, b)).toEqual(once);
    expect(mergeSaves(once, a)).toEqual(once);
  });
});
