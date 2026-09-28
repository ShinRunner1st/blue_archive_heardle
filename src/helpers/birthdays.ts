import { students } from "../constants/students";
import { Student } from "../types/student";

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
  return students.filter((student) => student.lore && isBirthday(student, day));
}
