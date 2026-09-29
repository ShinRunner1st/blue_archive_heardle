import { Server } from "../types/server";
import { Student } from "../types/student";
import { getServer } from "./server";
import { onServer } from "./studentRounds";

/** Whether it is the student's birthday on the player's own calendar. */
export function isBirthday(student: Student, date: Date = new Date()): boolean {
  return (
    student.birthday !== null &&
    student.birthday[0] === date.getMonth() + 1 &&
    student.birthday[1] === date.getDate()
  );
}

/**
 * The students whose birthday it is, for the note at the top of the page.
 * One each: the costumes share the student's birthday. In development,
 * `?birthday=<month>-<day>` shows the note for another day, to check it.
 */
export function birthdaysOn(date: Date = new Date()): Student[] {
  let day = date;
  if (import.meta.env.DEV) {
    const forced = new URLSearchParams(window.location.search).get("birthday");
    const match = forced && /^(\d{1,2})-(\d{1,2})$/.exec(forced);
    if (match) day = new Date(2024, Number(match[1]) - 1, Number(match[2]));
  }
  // Only the server's students: a JP-only one would be a stranger on Global.
  return onServer().filter(
    (student) => student.lore && isBirthday(student, day)
  );
}

/**
 * The students with a birthday in the `days` days from `from`, today first,
 * each with the day, for the hub. One each, as for the note.
 */
export function birthdaysWithin(
  days: number,
  from: Date = new Date(),
  server: Server = getServer()
): Array<{ student: Student; date: Date }> {
  const found: Array<{ student: Student; date: Date }> = [];
  for (let offset = 0; offset < days; offset++) {
    const date = new Date(
      from.getFullYear(),
      from.getMonth(),
      from.getDate() + offset
    );
    for (const student of onServer(server)) {
      if (student.lore && isBirthday(student, date)) {
        found.push({ student, date });
      }
    }
  }
  return found;
}
