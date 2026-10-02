// @vitest-environment node
import { describe, expect, it } from "vitest";

import { songs } from "../constants/songs";
import { students } from "../constants/students";
import { SKIPPED } from "../types/voice";
import { judgeDaily, VERIFIED_DAILIES, verifiedAnswer } from "./verifiedDaily";

// The accounts Worker has no page: no window, no localStorage, no server
// picked. The verified dailies must work there as they do in the browser
// (verifiedDaily.test.ts holds them to the page's own results).

describe("the verified dailies with no page", () => {
  it("runs where there is no browser", () => {
    expect(typeof window).toBe("undefined");
    expect(typeof localStorage).toBe("undefined");
  });

  it.each(VERIFIED_DAILIES)(
    "%s: an answer in the game for each of 800 days",
    (daily) => {
      const known =
        daily === "ost"
          ? new Set<string | number>(songs.map(({ themeNo }) => themeNo))
          : new Set<string | number>(students.map(({ id }) => id));
      for (let day = 1; day <= 800; day++) {
        expect(known.has(verifiedAnswer(daily, day))).toBe(true);
      }
    }
  );

  it.each(VERIFIED_DAILIES)("%s: judged, won and lost", (daily) => {
    const day = 100;
    const answer = verifiedAnswer(daily, day);
    expect(judgeDaily(daily, day, { guesses: [answer] })).toEqual({
      valid: true,
      outcome: "won",
      tries: 1,
    });
    const lost =
      daily === "ost"
        ? { guesses: [null, null, null, null, null, null] }
        : /^(gameplay|lore)\./.test(daily)
        ? { guesses: [], gaveUp: true }
        : { guesses: [SKIPPED, SKIPPED, SKIPPED, SKIPPED] };
    expect(judgeDaily(daily, day, lost)).toMatchObject({
      valid: true,
      outcome: "lost",
    });
  });
});
