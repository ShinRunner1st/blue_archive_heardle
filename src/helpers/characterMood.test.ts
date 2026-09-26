import { describe, expect, it } from "vitest";

import { spineCharacters } from "../constants/characters";
import { Moods, pickExpression } from "./characterMood";

const moods: Moods = {
  idle: "idle",
  listening: "listening",
  wrong: "wrong",
  nervous: ["n1", "n2", "n3", "n4", "n5"],
  won: ["w1", "w2", "w3", "w4", "w5", "w6"],
  lost: "lost",
  tapped: ["t"],
};

const state = {
  currentTry: 0,
  didGuess: false,
  playing: false,
  reacting: false,
};

describe("pickExpression", () => {
  it("is at ease before the first try", () => {
    expect(pickExpression(moods, state)).toBe("idle");
  });

  it("gets more nervous with every try used", () => {
    expect(
      [1, 2, 3, 4, 5].map((currentTry) =>
        pickExpression(moods, { ...state, currentTry })
      )
    ).toEqual(["n1", "n2", "n3", "n4", "n5"]);
  });

  it("listens while the clip plays", () => {
    expect(pickExpression(moods, { ...state, playing: true })).toBe(
      "listening"
    );
  });

  it("reacts to a wrong guess, even with the clip playing", () => {
    expect(
      pickExpression(moods, {
        ...state,
        currentTry: 2,
        reacting: true,
        playing: true,
      })
    ).toBe("wrong");
  });

  it("cheers a win by how quickly it came", () => {
    const won = (currentTry: number) =>
      pickExpression(moods, { ...state, didGuess: true, currentTry });

    expect(won(1)).toBe("w1");
    expect(won(6)).toBe("w6");
  });

  it("is sad at a loss, whatever is playing", () => {
    expect(
      pickExpression(moods, {
        ...state,
        currentTry: 6,
        playing: true,
        reacting: true,
      })
    ).toBe("lost");
  });

  it("keeps cheering while the answer plays on the result screen", () => {
    expect(
      pickExpression(moods, {
        ...state,
        didGuess: true,
        currentTry: 2,
        playing: true,
      })
    ).toBe("w2");
  });
});

describe("spineCharacters", () => {
  it("gives every character a face for every moment of a round", () => {
    for (const { moods: faces } of Object.values(spineCharacters)) {
      expect(faces.nervous).toHaveLength(5);
      expect(faces.won).toHaveLength(6);
      expect(faces.tapped.length).toBeGreaterThan(1);
    }
  });
});
