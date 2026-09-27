import { describe, expect, it } from "vitest";

import { answerRound, dealRound } from "../timeAttack";
import { timeAttackPictureContent } from "./timeAttackPicture";

const settings = { clip: 3, randomStart: true, answers: "choice" as const };

function run(results: boolean[]) {
  return results.map((right) => {
    const round = dealRound(settings, 1, []);
    return answerRound(round, right ? round.solution : null);
  });
}

describe("the time attack picture", () => {
  it("shows the score, the settings and a square a song, without names", () => {
    const rounds = run([true, false, true]);
    const content = timeAttackPictureContent({ rounds, settings, best: 9 });

    expect(content.title).toBe("2 songs in 3:00");
    expect(content.subtitle).toBe("4-Choice · 3s clips · random start");
    expect(content.squares).toEqual([true, false, true]);
    expect(content.more).toBe("");
    expect(content.stats).toEqual([
      { label: "Right", value: "2/3" },
      { label: "Best", value: "9" },
    ]);
    expect(JSON.stringify(content)).not.toContain(rounds[0].solution.name);
  });

  it("says how many songs didn't fit", () => {
    const content = timeAttackPictureContent({
      rounds: run(Array.from({ length: 50 }, () => true)),
      settings,
      best: 50,
    });

    expect(content.squares).toHaveLength(42);
    expect(content.more).toBe("+8");
  });

  it("speaks of one song", () => {
    const content = timeAttackPictureContent({
      rounds: run([true]),
      settings,
      best: 1,
    });

    expect(content.title).toBe("1 song in 3:00");
  });
});
