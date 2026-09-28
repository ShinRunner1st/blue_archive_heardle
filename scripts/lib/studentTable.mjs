import { readFileSync } from "node:fs";

export const TABLE_PATH = "src/constants/students.ts";

/**
 * The student table as `npm run students` last wrote it. The file is
 * TypeScript with a type import Node can't follow, so the list is read out
 * of it and loaded as a module of its own.
 */
export async function loadStudentTable() {
  const source = readFileSync(TABLE_PATH, "utf8");
  const start = source.indexOf("= [");
  const end = source.lastIndexOf("];");
  if (start < 0 || end < 0) throw new Error(`Could not read ${TABLE_PATH}`);
  const list = source.slice(start + 2, end + 1);
  const module = `export default ${list};`;
  const { default: students } = await import(
    `data:text/javascript;base64,${Buffer.from(module).toString("base64")}`
  );
  return students;
}
