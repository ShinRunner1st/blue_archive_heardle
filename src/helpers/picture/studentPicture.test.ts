import { describe, expect, it } from "vitest";

import { students } from "../../constants/students";
import { fakeContext } from "../../test/fakeCanvas";
import { drawRecapPicture } from "./recapPicture";
import {
  drawStudentPicture,
  studentPictureContent,
  studentPictureName,
  studentRecapContent,
  studentRecapName,
} from "./studentPicture";

const answer = students[0];
const wrong = students.slice(1, 9).map(({ id }) => id);

const daily = {
  game: "gameplay" as const,
  mode: "daily" as const,
  round: { answer: answer.id, guesses: [wrong[0], answer.id], day: 3 },
  answer,
  score: "",
  streak: 4,
};

describe("studentPictureContent", () => {
  it("shows how each guess went, and never the student in daily", () => {
    const content = studentPictureContent(daily);

    expect(content.tag).toBe("GAMEPLAY #3");
    expect(content.subtitle).toBe("Found in 2 guesses");
    expect(content.rows).toHaveLength(2);
    expect(content.rows[1]).toEqual(Array(7).fill("right"));
    expect(content.answer).toBeNull();
    expect(content.stats).toEqual([
      { label: "Guesses", value: "2" },
      { label: "Day streak", value: "4" },
    ]);

    const { ctx, texts } = fakeContext();
    drawStudentPicture(ctx, content, { backdrop: null, logo: null }, null);
    expect(texts.join(" ")).not.toContain(answer.name);
    expect(texts).toContain("Can you find today's student?");
  });

  it("names the student on an endless picture", () => {
    const content = studentPictureContent({
      ...daily,
      game: "lore",
      mode: "endless",
      round: { answer: answer.id, guesses: [wrong[0]], gaveUp: true },
      score: "3/5",
    });

    expect(content.tag).toBe("LORE ENDLESS");
    expect(content.subtitle).toBe("Gave up after 1 guess");
    expect(content.rows[0]).toHaveLength(8);

    const { ctx, texts } = fakeContext();
    drawStudentPicture(ctx, content, { backdrop: null, logo: null }, null);
    expect(texts).toContain(answer.name);
    expect(texts).toContain("3/5");
  });

  it("keeps a long hunt's start and end", () => {
    const content = studentPictureContent({
      ...daily,
      round: { answer: answer.id, guesses: [...wrong, answer.id], day: 3 },
    });
    expect(content.rows).toHaveLength(5);
    // Nine guesses: the first three, a note of five, and the last.
    expect(content.rows[3]).toEqual({ hidden: 5 });
  });

  it("names daily files by puzzle, endless ones by way to play", () => {
    expect(studentPictureName(daily)).toBe("baheardle-gameplay-3.png");
    expect(studentPictureName({ ...daily, mode: "endless" })).toBe(
      "baheardle-gameplay.png"
    );
  });
});

describe("studentRecapContent", () => {
  it("groups the guesses into seven bars", () => {
    const tally = [2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 3];
    const content = studentRecapContent(
      {
        game: "lore",
        mode: "daily",
        tally,
        played: 15,
        averageGuesses: 6.2,
        streak: 2,
        best: 5,
        found: 12,
      },
      new Date(2026, 8, 28)
    );

    expect(content.tag).toBe("LORE DAILY RECAP");
    expect(content.subtitle).toBe("As of 28 September 2026");
    expect(content.bars.map(({ label, count }) => [label, count])).toEqual([
      ["1", 1],
      ["2", 1],
      ["3", 1],
      ["4-5", 2],
      ["6-9", 4],
      ["10+", 3],
      ["X", 2],
    ]);
    expect(content.tiles[1]).toEqual({ label: "Found", value: "87%" });
    expect(content.footer).toContain("12 of 144 students found");

    const { ctx, texts } = fakeContext();
    drawRecapPicture(ctx, content, { backdrop: null, logo: null });
    expect(texts).toContain("Schale activity report");
  });

  it("names the file by way to play, mode and date", () => {
    expect(
      studentRecapName(
        { game: "gameplay", mode: "endless" },
        new Date(2026, 8, 28)
      )
    ).toBe("baheardle-gameplay-endless-recap-2026-09-28.png");
  });
});
