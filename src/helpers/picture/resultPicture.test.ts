import { describe, expect, it } from "vitest";

import { Round } from "../../types/stats";
import { emptyGuesses } from "../storage";
import {
  drawResultPicture,
  resultPictureContent,
  resultPictureName,
} from "./resultPicture";

const solution = {
  artist: "Mitsukiyo",
  name: "Constant Moderato",
  themeNo: "1",
};

function won(day?: number): Round {
  const guesses = emptyGuesses();
  guesses[0] = { song: solution, skipped: false, isCorrect: false };
  guesses[1] = { song: undefined, skipped: true, isCorrect: undefined };
  guesses[2] = { song: solution, skipped: false, isCorrect: true };
  return {
    solution,
    currentTry: 3,
    didGuess: true,
    guesses,
    startTime: 0,
    ...(day === undefined ? {} : { day }),
  };
}

/**
 * Stands in for the canvas jsdom doesn't have, keeping every line of text
 * drawn. Text is measured at half its font size per character.
 */
function fakeContext() {
  const texts: string[] = [];
  let size = 10;
  const ctx = new Proxy(
    {
      fillText: (text: string) => texts.push(text),
      measureText: (text: string) => ({ width: text.length * size * 0.5 }),
    } as Record<string, unknown>,
    {
      get: (target, key: string) => target[key] ?? (() => {}),
      set: (target, key: string, value) => {
        if (key === "font") size = Number(/(\d+)px/.exec(value)?.[1] ?? 10);
        target[key] = value;
        return true;
      },
    }
  );
  return { ctx: ctx as unknown as CanvasRenderingContext2D, texts };
}

describe("the result picture", () => {
  it("shows a daily round without the song", () => {
    const content = resultPictureContent({
      mode: "daily",
      round: won(12),
      score: "3/4",
      streak: 5,
    });

    expect(content).toEqual({
      tag: "DAILY #12",
      title: "Mission complete, Sensei~",
      subtitle: "Guessed in 3 of 6 tries",
      tries: ["wrong", "skipped", "correct", "unused", "unused", "unused"],
      stats: [
        { label: "Tries", value: "3/6" },
        { label: "Day streak", value: "5" },
      ],
      song: null,
    });

    const { ctx, texts } = fakeContext();
    drawResultPicture(ctx, content, { backdrop: null, logo: null });
    const drawn = texts.join("\n");
    expect(drawn).toContain("DAILY #12");
    expect(drawn).not.toContain("Constant Moderato");
    expect(drawn).not.toContain("Mitsukiyo");
  });

  it("shows the song, score and win streak on endless", () => {
    const lost: Round = { ...won(), currentTry: 6, didGuess: false };
    const content = resultPictureContent({
      mode: "endless",
      round: lost,
      score: "124/156",
      streak: 0,
    });

    expect(content.tag).toBe("ENDLESS");
    expect(content.title).toBe("Tactical retreat, Sensei…");
    expect(content.subtitle).toBe("Not guessed in 6 tries");
    expect(content.stats[0]).toEqual({ label: "Score", value: "124/156" });

    const { ctx, texts } = fakeContext();
    drawResultPicture(ctx, content, { backdrop: null, logo: null });
    expect(texts).toContain("Constant Moderato");
    expect(texts).toContain("Mitsukiyo · Theme 1");
  });

  it("cuts a song name too long for the picture short", () => {
    const content = resultPictureContent({
      mode: "endless",
      round: { ...won(), solution: { ...solution, name: "A".repeat(200) } },
      score: "1/1",
      streak: 1,
    });

    const { ctx, texts } = fakeContext();
    drawResultPicture(ctx, content, { backdrop: null, logo: null });
    const name = texts.find((text) => text.startsWith("AAA"));
    expect(name?.endsWith("…")).toBe(true);
    // Measured at 24px (the smallest size), half as wide per character.
    expect(name!.length * 12).toBeLessThanOrEqual(700);
  });

  it("names a daily file by puzzle and an endless one never by song", () => {
    expect(
      resultPictureName({ mode: "daily", round: won(12), score: "", streak: 0 })
    ).toBe("baheardle-daily-12.png");
    expect(
      resultPictureName({ mode: "endless", round: won(), score: "", streak: 0 })
    ).toBe("baheardle-endless.png");
  });
});
