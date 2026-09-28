import { beforeEach, describe, expect, it } from "vitest";

import { VOICE_TIME_ATTACK_SETTINGS_KEY } from "../constants/game";
import { SKIPPED, VoiceRound } from "../types/voice";
import {
  answerVoiceRound,
  dealVoiceRound,
  loadVoiceSettings,
  saveVoiceSettings,
  voiceRunsOf,
  voiceTimeAttackShareText,
  voiceTimeAttackStats,
} from "./voiceTimeAttack";
import { hasTitleCall, isWon, lineCount } from "./voiceRounds";

beforeEach(() => {
  localStorage.clear();
});

describe("Voice time attack settings", () => {
  it("default to four answers and remember a change", () => {
    expect(loadVoiceSettings()).toEqual({ answers: "choice", lines: "all" });
    saveVoiceSettings({ answers: "typed", lines: "all" });
    expect(loadVoiceSettings()).toEqual({ answers: "typed", lines: "all" });
    saveVoiceSettings({ answers: "typed", lines: "titles" });
    expect(loadVoiceSettings()).toEqual({ answers: "typed", lines: "titles" });
  });

  it("fall back when the stored value is bad", () => {
    localStorage.setItem(VOICE_TIME_ATTACK_SETTINGS_KEY, "{");
    expect(loadVoiceSettings()).toEqual({ answers: "choice", lines: "all" });
    localStorage.setItem(VOICE_TIME_ATTACK_SETTINGS_KEY, '{"answers":"x"}');
    expect(loadVoiceSettings()).toEqual({ answers: "choice", lines: "all" });
  });
});

describe("dealVoiceRound", () => {
  it("deals a line of the run, with four answers when asked", () => {
    const choice = dealVoiceRound({ answers: "choice", lines: "all" }, 7, []);
    expect(choice.run).toBe(7);
    expect(choice.choices).toHaveLength(4);
    expect(choice.choices).toContain(choice.answer);
    expect(choice.line).toBeLessThan(lineCount(choice.answer));

    const typed = dealVoiceRound({ answers: "typed", lines: "all" }, 7, [
      choice,
    ]);
    expect(typed.choices).toBeUndefined();
    expect(typed.answer).not.toBe(choice.answer);
  });

  it("deals only title calls, from students who have one, when asked", () => {
    const played: VoiceRound[] = [];
    for (let i = 0; i < 40; i++) {
      const round = dealVoiceRound(
        { answers: "typed", lines: "titles" },
        3,
        played
      );
      expect(round.line).toBe(0);
      expect(round.titles).toBe(true);
      expect(hasTitleCall(round.answer)).toBe(true);
      played.push(round);
    }
    expect(voiceRunsOf(played)[0].titles).toBe(true);
  });
});

describe("answerVoiceRound", () => {
  it("answers once, or passes", () => {
    const round = dealVoiceRound({ answers: "typed", lines: "all" }, 1, []);
    expect(isWon(answerVoiceRound(round, round.answer))).toBe(true);
    expect(answerVoiceRound(round, null).guesses).toEqual([SKIPPED]);
  });
});

describe("runs", () => {
  const run = (id: number, rights: boolean[], choice: boolean): VoiceRound[] =>
    rights.map((right) => ({
      answer: 10000,
      line: 0,
      guesses: [right ? 10000 : SKIPPED],
      run: id,
      ...(choice ? { choices: [10000, 1, 2, 3] } : {}),
    }));

  it("are read back from the saved lines, oldest first", () => {
    const rounds = [
      ...run(2, [true, false], false),
      ...run(1, [true, true, true], true),
    ];
    expect(voiceRunsOf(rounds)).toEqual([
      {
        id: 1,
        score: 3,
        answered: 3,
        answers: "choice",
        clip: 0,
        titles: false,
      },
      {
        id: 2,
        score: 1,
        answered: 2,
        answers: "typed",
        clip: 0,
        titles: false,
      },
    ]);

    const stats = voiceTimeAttackStats(rounds);
    expect(stats.runs).toBe(2);
    expect(stats.best).toEqual({ typed: 1, choice: 3 });
    expect(stats.right).toBe(4);
    expect(stats.answered).toBe(5);
    expect(stats.last?.id).toBe(2);
  });

  it("share a line of squares and no names", () => {
    const text = voiceTimeAttackShareText(run(1, [true, false, true], false), {
      answers: "typed",
      lines: "titles",
    });
    expect(text).toContain("2 right in 3:00 · Typed · Title calls");
    expect(text).toContain("🟩🟥🟩");
  });
});
