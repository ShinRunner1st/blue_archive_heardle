import { describe, expect, it } from "vitest";

import { Student } from "../types/student";
import {
  birthdayText,
  CLUE_KEYS,
  compareStudents,
  describeClue,
} from "./studentClues";

function student(overrides: Partial<Student> = {}): Student {
  return {
    id: 1,
    name: "Hoshino",
    fullName: "Takanashi Hoshino",
    lore: true,
    school: "Abydos",
    role: "Tank",
    damage: "Piercing",
    weapon: "SG",
    exCost: 4,
    order: 5,
    height: 145,
    birthday: [1, 2],
    year: "3rd Year",
    club: "Foreclosure Task Force",
    gifts: ["Lace Pillow"],
    ...overrides,
  };
}

/** The clue for one column, guessing `guess` against `answer`. */
function clue(key: string, guess: Student, answer: Student) {
  const game = CLUE_KEYS.gameplay.includes(key as never) ? "gameplay" : "lore";
  const found = compareStudents(guess, answer, game).find((c) => c.key === key);
  if (!found) throw new Error(`no ${key} clue`);
  return found;
}

describe("compareStudents", () => {
  it("gives each way to play its own columns, in order", () => {
    const answer = student();
    expect(
      compareStudents(answer, answer, "gameplay").map((c) => c.key)
    ).toEqual(["school", "role", "damage", "weapon", "exCost", "order"]);
    expect(compareStudents(answer, answer, "lore").map((c) => c.key)).toEqual([
      "height",
      "school",
      "birthday",
      "year",
      "weapon",
      "gifts",
      "club",
      "order",
    ]);
  });

  it("marks everything right for the answer itself", () => {
    const answer = student();
    for (const game of ["gameplay", "lore"] as const) {
      expect(
        compareStudents(answer, answer, game).every(
          (c) => c.verdict === "right" && !c.arrow
        )
      ).toBe(true);
    }
  });

  it("marks words right or wrong", () => {
    const answer = student();
    expect(clue("school", student({ school: "Trinity" }), answer)).toEqual({
      key: "school",
      text: "Trinity",
      verdict: "wrong",
    });
  });

  it("points numbers towards the answer", () => {
    const answer = student({ exCost: 4, order: 5, height: 145 });
    expect(clue("exCost", student({ exCost: 2 }), answer)).toMatchObject({
      verdict: "wrong",
      arrow: "up",
    });
    expect(clue("order", student({ order: 90 }), answer)).toMatchObject({
      text: "#91",
      arrow: "down",
    });
    expect(clue("height", student({ height: 160 }), answer)).toMatchObject({
      text: "160 cm",
      arrow: "down",
    });
  });

  it("has no arrow from a height the game doesn't give", () => {
    const answer = student();
    expect(clue("height", student({ height: null }), answer)).toEqual({
      key: "height",
      text: "?",
      verdict: "wrong",
    });
  });

  it("calls a birthday in the right month close", () => {
    const answer = student({ birthday: [1, 2] });
    expect(clue("birthday", student({ birthday: [1, 20] }), answer)).toEqual({
      key: "birthday",
      text: "Jan 20",
      verdict: "close",
      arrow: "down",
    });
    expect(
      clue("birthday", student({ birthday: [12, 1] }), answer)
    ).toMatchObject({ verdict: "wrong", arrow: "down" });
    expect(
      clue(
        "birthday",
        student({ birthday: [3, 1] }),
        student({ birthday: [12, 1] })
      )
    ).toMatchObject({ verdict: "wrong", arrow: "up" });
  });

  it("points school years up or down, and matches the others by name", () => {
    const answer = student({ year: "3rd Year" });
    expect(clue("year", student({ year: "1st Year" }), answer)).toMatchObject({
      verdict: "wrong",
      arrow: "up",
    });
    expect(clue("year", student({ year: "Suspended" }), answer)).toEqual({
      key: "year",
      text: "Suspended",
      verdict: "wrong",
    });
    expect(
      clue(
        "year",
        student({ year: "Suspended" }),
        student({ year: "Drop out" })
      ).verdict
    ).toBe("wrong");
    expect(
      clue(
        "year",
        student({ year: "Suspended" }),
        student({ year: "Suspended" })
      ).verdict
    ).toBe("right");
  });

  it("calls gifts close when some are shared", () => {
    const answer = student({
      gifts: ["Lace Pillow", "Antique Egg Handicraft"],
    });
    expect(
      clue("gifts", student({ gifts: ["Lace Pillow"] }), answer)
    ).toMatchObject({ verdict: "close", text: "Lace Pillow" });
    expect(
      clue("gifts", student({ gifts: ["Sewing Kit"] }), answer).verdict
    ).toBe("wrong");
    expect(
      clue("gifts", student({ gifts: [] }), student({ gifts: [] }))
    ).toEqual({ key: "gifts", text: "None", verdict: "right" });
  });
});

describe("birthdayText", () => {
  it("writes a short date", () => {
    expect(birthdayText([1, 2])).toBe("Jan 2");
    expect(birthdayText([12, 31])).toBe("Dec 31");
  });
});

describe("describeClue", () => {
  it("says what an arrow means", () => {
    expect(
      describeClue({
        key: "height",
        text: "145 cm",
        verdict: "wrong",
        arrow: "up",
      })
    ).toBe("Height 145 cm, wrong, the answer is taller");
    expect(
      describeClue({ key: "school", text: "Abydos", verdict: "right" })
    ).toBe("School Abydos, right");
  });
});
