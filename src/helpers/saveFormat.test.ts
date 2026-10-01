import { beforeEach, describe, expect, it } from "vitest";

import { DAILY_STORAGE_KEY, SAVE_FORMAT_KEY } from "../constants/game";
import {
  isRoundId,
  legacyRoundId,
  newRoundId,
  stamped,
  withoutStamp,
} from "./roundId";
import { upgradeSaves } from "./saveFormat";
import {
  emptyGuesses,
  loadRounds,
  loadStudentRounds,
  loadVoiceRounds,
  saveRounds,
  saveStudentRounds,
  saveVoiceRounds,
} from "./storage";

const song = { artist: "Mitsukiyo", name: "Constant Moderato", themeNo: "1" };
const round = (day: number) => ({
  solution: song,
  currentTry: 1,
  didGuess: true,
  guesses: emptyGuesses(),
  startTime: 0,
  day,
});

describe("round ids", () => {
  it("makes random ids, and stamps a new round with one and the time", () => {
    const one = newRoundId();
    expect(isRoundId(one)).toBe(true);
    expect(newRoundId()).not.toBe(one);
    expect(stamped({ answer: 1 }, 1234)).toEqual({
      answer: 1,
      id: expect.stringMatching(/^[0-9a-f]{12}$/),
      at: 1234,
    });
  });

  it("gives an old round the same id for the same slot, place and contents", () => {
    const id = legacyRoundId("ost:daily", 0, round(1));
    expect(isRoundId(id)).toBe(true);
    expect(id.startsWith("l")).toBe(true);
    expect(legacyRoundId("ost:daily", 0, round(1))).toBe(id);
    expect(legacyRoundId("ost:daily", 1, round(1))).not.toBe(id);
    expect(legacyRoundId("ost:endless", 0, round(1))).not.toBe(id);
    expect(legacyRoundId("ost:daily", 0, round(2))).not.toBe(id);
  });
});

describe("upgradeSaves", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("gives every saved round an id, once, and marks the format", () => {
    saveRounds([round(1), round(2)], "daily");
    saveStudentRounds("lore-endless", [{ answer: 10005, guesses: [] }], "jp");
    saveVoiceRounds("endless", [{ answer: 10005, line: 0, guesses: [] }]);

    upgradeSaves();

    const daily = loadRounds("daily");
    expect(daily.every((each) => isRoundId(each.id))).toBe(true);
    expect(new Set(daily.map((each) => each.id)).size).toBe(2);
    expect(isRoundId(loadStudentRounds("lore-endless", "jp")[0].id)).toBe(true);
    expect(isRoundId(loadVoiceRounds("endless", "global")[0].id)).toBe(true);
    expect(localStorage.getItem(SAVE_FORMAT_KEY)).toBe("2");

    // Rounds aren't touched otherwise, and a second run changes nothing.
    expect(daily.map(withoutStamp)).toEqual([round(1), round(2)]);
    const before = localStorage.getItem(DAILY_STORAGE_KEY);
    expect(before).not.toBeNull();
    upgradeSaves();
    expect(localStorage.getItem(DAILY_STORAGE_KEY)).toBe(before);
  });

  it("keeps the ids rounds already have", () => {
    saveRounds([{ ...round(1), id: "0123456789ab", at: 5 }], "daily");
    upgradeSaves();
    expect(loadRounds("daily")[0]).toMatchObject({
      id: "0123456789ab",
      at: 5,
    });
  });

  it("does nothing once the saves are format 2", () => {
    localStorage.setItem(SAVE_FORMAT_KEY, "2");
    saveRounds([round(1)], "daily");
    upgradeSaves();
    expect(loadRounds("daily")[0].id).toBeUndefined();
  });
});
