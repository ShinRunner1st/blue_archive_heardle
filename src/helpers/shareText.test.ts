import { describe, expect, it } from "vitest";

import { songs } from "../constants";
import { buildShareText } from "./shareText";
import { emptyGuesses } from "./storage";
import { GuessType } from "../types/guess";
import { Round } from "../types/stats";

type Outcome = "wrong" | "skip" | "correct";

function slot(outcome: Outcome): GuessType {
  if (outcome === "skip") {
    return { song: undefined, skipped: true, isCorrect: undefined };
  }

  return {
    song: songs[0],
    skipped: false,
    isCorrect: outcome === "correct",
  };
}

function round(outcomes: Outcome[], day?: number): Round {
  const guesses = emptyGuesses();
  outcomes.forEach((outcome, index) => {
    guesses[index] = slot(outcome);
  });

  return {
    solution: songs[0],
    currentTry: outcomes.length,
    didGuess: outcomes.includes("correct"),
    guesses,
    startTime: 0,
    ...(day === undefined ? {} : { day }),
  };
}

const strip = (text: string) => text.split("\n")[1];

describe("buildShareText", () => {
  it("draws the round as a strip of squares", () => {
    const text = buildShareText({
      mode: "daily",
      round: round(["skip", "wrong", "correct"], 7),
      score: "1/1",
    });

    expect(strip(text)).toBe("🔈⬛🟥🟩⬜⬜⬜");
  });

  it("leaves every square blank on an untouched round", () => {
    const text = buildShareText({
      mode: "endless",
      round: round([]),
      score: "0/0",
    });

    expect(strip(text)).toBe("🔈⬜⬜⬜⬜⬜⬜");
  });

  it("fills the strip with red on a loss", () => {
    const outcomes: Outcome[] = Array.from({ length: 6 }, () => "wrong");
    const text = buildShareText({
      mode: "endless",
      round: round(outcomes),
      score: "0/1",
    });

    expect(strip(text)).toBe("🔈🟥🟥🟥🟥🟥🟥");
  });

  it("heads a daily result with its puzzle number, so results compare", () => {
    const text = buildShareText({
      mode: "daily",
      round: round(["correct"], 12),
      score: "1/1",
    });

    expect(text.split("\n")[0]).toBe("Blue Archive Heardle #12");
    // The running tally is personal and not comparable, so it stays out.
    expect(text).not.toContain("Score:");
  });

  it("marks an endless result as such and keeps the running score", () => {
    const text = buildShareText({
      mode: "endless",
      round: round(["correct"]),
      score: "4/7",
    });

    expect(text.split("\n")[0]).toBe("Blue Archive Heardle (Endless)");
    expect(text).toContain("Score: 4/7");
  });

  it("shows a four-choice round as one square, with the score", () => {
    const text = buildShareText({
      mode: "choice",
      round: { ...round(["correct"]), tries: 1, choices: ["1", "2", "3", "4"] },
      score: "7/9",
    });

    expect(text.split("\n")[0]).toBe("Blue Archive Heardle (4-Choice)");
    expect(strip(text)).toBe("🔈🟩");
    expect(text).toContain("Score: 7/9");
  });

  it("never leaks the answer", () => {
    const text = buildShareText({
      mode: "daily",
      round: round(["correct"], 3),
      score: "1/1",
    });

    expect(text).not.toContain(songs[0].name);
    expect(text).not.toContain(`Theme_${songs[0].themeNo}`);
  });

  it("links back to the site", () => {
    const text = buildShareText({
      mode: "daily",
      round: round(["correct"], 3),
      score: "1/1",
    });

    expect(text.endsWith("https://baheardle.com/")).toBe(true);
  });
});
