import { describe, expect, it } from "vitest";

import { students } from "../constants/students";
import { birthdaysOn, isBirthday } from "./birthdays";

const hoshino = students.find(({ name }) => name === "Hoshino")!;

describe("birthdays", () => {
  it("knows a student's birthday by the player's calendar", () => {
    expect(isBirthday(hoshino, new Date(2027, 0, 2, 23, 59))).toBe(true);
    expect(isBirthday(hoshino, new Date(2027, 0, 3))).toBe(false);
  });

  it("lists each student once, not their costumes", () => {
    const today = birthdaysOn(new Date(2027, 0, 2));
    expect(today.map(({ name }) => name)).toContain("Hoshino");
    expect(today.every(({ lore }) => lore)).toBe(true);
  });

  it("has nobody on a day with no birthday", () => {
    const empty = Array.from(
      { length: 366 },
      (_, i) => new Date(2024, 0, 1 + i)
    )
      .map((date) => birthdaysOn(date))
      .filter((list) => list.length === 0);
    // Most days have a birthday, but not all.
    expect(empty.length).toBeGreaterThan(0);
  });
});
