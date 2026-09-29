import { describe, expect, it } from "vitest";

import { students } from "../constants/students";
import { buildStudentShareText } from "./studentShare";

const answer = students[0];
const wrong = students.slice(1, 13).map(({ id }) => id);

describe("buildStudentShareText", () => {
  it("draws a row of squares per guess, oldest first", () => {
    const text = buildStudentShareText({
      game: "gameplay",
      mode: "daily",
      round: { answer: answer.id, guesses: [wrong[0], answer.id], day: 7 },
      answer,
      score: "",
    });
    const lines = text.split("\n");

    expect(lines[0]).toBe("Blue Archive Heardle · Students (Gameplay) #7");
    expect(lines[2]).toBe("🟩".repeat(7));
    expect(lines[3]).toBe("Found in 2 guesses");
    expect(lines[4]).toBe("https://baheardle.com/students");
    expect(text).not.toContain(answer.name);
  });

  it("adds the time when the round was timed", () => {
    const text = buildStudentShareText({
      game: "gameplay",
      mode: "daily",
      round: {
        answer: answer.id,
        guesses: [wrong[0], answer.id],
        day: 7,
        time: 102_000,
      },
      answer,
      score: "",
    });
    expect(text.split("\n")[3]).toBe("Found in 2 guesses · ⏱️ 1:42");
  });

  it("shortens a long hunt, keeping its start and end", () => {
    const text = buildStudentShareText({
      game: "lore",
      mode: "endless",
      round: { answer: answer.id, guesses: [...wrong, answer.id] },
      answer,
      score: "5/9",
    });
    const lines = text.split("\n");

    expect(lines).toContain("… 6 more");
    expect(lines).toContain("Found in 13 guesses");
    expect(lines).toContain("Score: 5/9");
    // Title, 6 rows, the gap, the last row, and three more lines.
    expect(lines).toHaveLength(12);
    expect(lines[8]).toBe("🟩".repeat(8));
  });

  it("says when the player gave up", () => {
    const text = buildStudentShareText({
      game: "lore",
      mode: "endless",
      round: { answer: answer.id, guesses: [wrong[0]], gaveUp: true },
      answer,
      score: "0/1",
    });
    expect(text).toContain("Gave up after 1 guess");
  });
});
