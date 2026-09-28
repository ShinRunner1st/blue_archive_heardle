import { Student } from "../types/student";

/** How many matches the search offers at once. */
export const MAX_STUDENT_RESULTS = 8;

/** Lower case, letters and digits only: "Shiroko*Terror" is "shiroko terror". */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * The students whose name matches every word typed, in either order and
 * with or without the family name: "armed hoshino" finds Hoshino (Armed).
 * Names starting with the words come first, then the rest by release.
 */
export function searchStudents(
  query: string,
  pool: Student[],
  exclude: ReadonlySet<number> = new Set()
): Student[] {
  const words = normalize(query).split(" ").filter(Boolean);
  if (words.length === 0) return [];

  const matches = pool.filter((student) => {
    if (exclude.has(student.id)) return false;
    const text = ` ${normalize(`${student.name} ${student.fullName}`)}`;
    return words.every((word) => text.includes(` ${word}`));
  });

  const first = normalize(query);
  const rank = (student: Student) =>
    normalize(student.name).startsWith(first) ? 0 : 1;

  return matches
    .map((student, index) => ({ student, index }))
    .sort((a, b) => rank(a.student) - rank(b.student) || a.index - b.index)
    .slice(0, MAX_STUDENT_RESULTS)
    .map(({ student }) => student);
}
