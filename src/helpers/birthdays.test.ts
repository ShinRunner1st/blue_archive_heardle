import { describe, expect, it } from "vitest";

import { students } from "../constants/students";
import { birthdaysOn, birthdaysWithin, isBirthday } from "./birthdays";

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

describe("birthdaysWithin", () => {
  it("lists the coming week's birthdays, today first, once each", () => {
    const from = new Date(2026, 9, 1);
    const soon = birthdaysWithin(7, from);
    const days = soon.map(({ date }) => date.getTime());

    expect(days).toEqual([...days].sort((a, b) => a - b));
    for (const { student, date } of soon) {
      expect(student.lore).toBe(true);
      expect(student.birthday).toEqual([date.getMonth() + 1, date.getDate()]);
      expect(date.getTime()).toBeLessThan(new Date(2026, 9, 8).getTime());
    }
    expect(new Set(soon.map(({ student }) => student.id)).size).toBe(
      soon.length
    );
  });

  it("runs over the end of the year", () => {
    const soon = birthdaysWithin(7, new Date(2026, 11, 29));

    const hers = soon.find(({ student }) => student.id === hoshino.id);

    expect(hers?.date).toEqual(new Date(2027, 0, 2));
  });
});
