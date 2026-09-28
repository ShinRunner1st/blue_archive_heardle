import { describe, expect, it } from "vitest";

import { students } from "../constants/students";
import { MAX_STUDENT_RESULTS, searchStudents } from "./searchStudent";

const names = (query: string, exclude?: Set<number>) =>
  searchStudents(query, students, exclude).map(({ name }) => name);

describe("searchStudents", () => {
  it("finds by the start of any word, the name first", () => {
    expect(names("hoshino")[0]).toBe("Hoshino");
    expect(names("takanashi")).toContain("Hoshino");
    expect(names("oshino")).toEqual([]);
  });

  it("matches every word in any order", () => {
    expect(names("armed hoshino")).toEqual(["Hoshino (Armed)"]);
    expect(names("shiroko terror")).toEqual(["Shiroko*Terror"]);
  });

  it("ignores case and punctuation", () => {
    expect(names("HOSHINO (swimsuit")).toContain("Hoshino (Swimsuit)");
  });

  it("leaves out the excluded and stops at a handful", () => {
    const hoshino = students.find(({ name }) => name === "Hoshino")!;
    expect(names("hoshino", new Set([hoshino.id]))).not.toContain("Hoshino");
    expect(names("a").length).toBeLessThanOrEqual(MAX_STUDENT_RESULTS);
    expect(names("   ")).toEqual([]);
  });
});
