import { describe, expect, it } from "vitest";

import { ruleSentence, waysLine } from "./ruleText";

describe("a rule in words", () => {
  it("says which ways to play it counts from", () => {
    expect(waysLine({ count: "rounds", games: ["ost"] })).toBe(
      "OST: every way"
    );
    expect(waysLine({ count: "run", games: ["ost", "voice"] })).toBe(
      "OST: Time Attack · Voice: Time Attack"
    );
    expect(waysLine({ count: "rounds", clip: 2, seconds: 30 })).toBe("");
  });

  it("drafts the mission's text", () => {
    expect(
      ruleSentence(
        {
          count: "rounds",
          games: ["ost"],
          modes: ["daily", "classic"],
          tries: 1,
        },
        10
      )
    ).toBe("Guess 10 songs on the first try, in Daily or Classic.");
    expect(
      ruleSentence({ count: "streak", games: ["halo"], silhouette: true }, 10)
    ).toBe("Name 10 halos in a row from the silhouette.");
    expect(
      ruleSentence({ count: "rounds", server: "jp", result: "played" }, 100)
    ).toBe("Play 100 rounds on JP.");
    expect(ruleSentence({ count: "dayStreak", games: ["voice"] }, 14)).toBe(
      "Clear a daily puzzle 14 days in a row, in Voice."
    );
    expect(
      ruleSentence({ count: "different", games: ["voice", "halo"] }, 50)
    ).toBe("Name 50 different answers, in Voice or Halo.");
    expect(
      ruleSentence({ count: "rounds", games: ["lore"], seconds: 30 }, 5)
    ).toBe("Find 5 students in under 30 seconds, in Lore.");
  });
});
