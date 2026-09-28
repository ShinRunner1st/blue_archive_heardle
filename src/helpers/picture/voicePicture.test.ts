import { describe, expect, it } from "vitest";

import { students } from "../../constants/students";
import { SKIPPED } from "../../types/voice";
import {
  voicePictureContent,
  voicePictureName,
  voiceRecapContent,
  voiceTimeAttackPictureContent,
  voiceTimeAttackRecapContent,
} from "./voicePicture";

const hoshino = students.find(({ name }) => name === "Hoshino")!;
const aru = students.find(({ name }) => name === "Aru")!;

describe("voicePictureContent", () => {
  it("never names the student on a daily picture", () => {
    const content = voicePictureContent({
      mode: "daily",
      round: {
        answer: hoshino.id,
        line: 0,
        guesses: [aru.id, SKIPPED, hoshino.id],
        day: 12,
      },
      answer: hoshino,
      score: "",
      streak: 3,
    });
    expect(content.tag).toBe("VOICE #12");
    expect(content.tries).toEqual(["wrong", "skipped", "right", "unused"]);
    expect(content.answer).toBeNull();
    expect(content.stats).toEqual([
      { label: "Tries", value: "3/4" },
      { label: "Day streak", value: "3" },
    ]);
    expect(JSON.stringify(content)).not.toContain("Hoshino");
  });

  it("shows who it was on an endless picture", () => {
    const content = voicePictureContent({
      mode: "choice",
      round: {
        answer: hoshino.id,
        line: 1,
        guesses: [aru.id],
        choices: [aru.id, hoshino.id, 10002, 10003],
      },
      answer: hoshino,
      score: "4/7",
      streak: 0,
    });
    expect(content.tag).toBe("VOICE 4-CHOICE");
    expect(content.tries).toEqual(["wrong"]);
    expect(content.answer?.id).toBe(hoshino.id);
    expect(content.stats[0]).toEqual({ label: "Score", value: "4/7" });
  });

  it("names daily files by puzzle", () => {
    expect(
      voicePictureName({
        mode: "daily",
        round: { answer: 1, line: 0, guesses: [], day: 5 },
      })
    ).toBe("baheardle-voice-5.png");
  });
});

describe("voiceRecapContent", () => {
  it("has a bar for each try, then misses", () => {
    const content = voiceRecapContent({
      mode: "endless",
      tally: [1, 2, 3, 0, 4],
      played: 10,
      streak: 2,
      best: 5,
      found: 8,
    });
    expect(content.bars.map(({ label }) => label)).toEqual([
      "1",
      "2",
      "3",
      "4",
      "X",
    ]);
    expect(content.tiles[1]).toEqual({ label: "Named", value: "90%" });
  });
});

describe("Voice time attack pictures", () => {
  it("count voices, and name nobody", () => {
    const content = voiceTimeAttackPictureContent({
      rounds: [
        { answer: hoshino.id, line: 0, guesses: [hoshino.id], run: 1 },
        { answer: aru.id, line: 0, guesses: [SKIPPED], run: 1 },
      ],
      settings: { answers: "typed", lines: "titles" },
      best: 4,
    });
    expect(content.title).toBe("1 voice in 3:00");
    expect(content.subtitle).toBe("Typed · Title calls");
    expect(content.squares).toEqual([true, false]);
    expect(JSON.stringify(content)).not.toContain("Hoshino");
  });

  it("recap the best run for each way to play", () => {
    const content = voiceTimeAttackRecapContent(
      {
        runs: 2,
        best: { typed: 6, choice: 9 },
        right: 15,
        answered: 20,
        last: null,
      },
      [
        { id: 1, score: 6, answered: 8, answers: "typed", clip: 0 },
        {
          id: 2,
          score: 9,
          answered: 12,
          answers: "choice",
          clip: 0,
          titles: true,
        },
      ]
    );
    expect(content.bars.map(({ count }) => count)).toEqual([6, 0, 0, 9]);
  });
});
