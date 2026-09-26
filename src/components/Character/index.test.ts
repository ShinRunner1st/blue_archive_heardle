import React, { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { spineCharacters } from "../../constants/characters";
import { setCharacterChoice } from "../../helpers/characterChoice";
import { emptyGuesses } from "../../helpers/storage";
import { createHarness } from "../../test/harness";

import { Character } from "./index";

// jsdom has no WebGL: a stand-in stage records what it is asked to show.
const stage = {
  show: vi.fn(),
  preload: vi.fn(),
  setExpression: vi.fn(),
  onReady: vi.fn(),
  dispose: vi.fn(),
};
vi.mock("../../helpers/spineStage", () => ({ createStage: () => stage }));

let harness: ReturnType<typeof createHarness>;
let wide = true;

async function mount(
  overrides: Partial<React.ComponentProps<typeof Character>> = {}
) {
  harness.render(
    React.createElement(Character, {
      guesses: emptyGuesses(),
      currentTry: 0,
      didGuess: false,
      roundKey: "endless::1",
      ...overrides,
    })
  );
  await act(async () => {
    await vi.dynamicImportSettled();
  });
}

describe("Character", () => {
  beforeEach(() => {
    wide = true;
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: query.includes("min-width") ? wide : false,
      addEventListener: () => {},
      removeEventListener: () => {},
    }));
    Object.values(stage).forEach((fn) => fn.mockClear());
    harness = createHarness();
  });

  afterEach(() => {
    harness.destroy();
    vi.unstubAllGlobals();
  });

  it("is left out on narrow screens, so nothing of her loads", async () => {
    wide = false;
    await mount();

    expect(harness.container.querySelector("canvas")).toBeNull();
    expect(stage.show).not.toHaveBeenCalled();
  });

  it("is left out when the player turned her off", async () => {
    setCharacterChoice("off");
    await mount();

    expect(harness.container.querySelector("canvas")).toBeNull();
  });

  it("shows Arona in light mode, at ease", async () => {
    await mount();

    expect(stage.show).toHaveBeenCalledWith(spineCharacters.arona);
    expect(stage.setExpression).toHaveBeenLastCalledWith(
      spineCharacters.arona.moods.idle
    );
  });

  it("shows Mari when the player picked her", async () => {
    setCharacterChoice("mari");
    await mount();

    expect(stage.show).toHaveBeenCalledWith(spineCharacters.mari);
  });

  it("cheers when the round is won", async () => {
    await mount();
    await mount({ currentTry: 1, didGuess: true });

    expect(stage.setExpression).toHaveBeenLastCalledWith(
      spineCharacters.arona.moods.won[0]
    );
  });

  it("stops listening once a new round starts, even if the answer was still playing", async () => {
    // The result screen's player, mid-answer.
    const answer = document.createElement("audio");
    Object.defineProperty(answer, "paused", { value: false });
    document.body.appendChild(answer);
    await mount({ currentTry: 6 });

    // Continue: the result screen, and its player, are gone.
    answer.remove();
    await mount({ currentTry: 0, roundKey: "endless::2" });

    expect(stage.setExpression).toHaveBeenLastCalledWith(
      spineCharacters.arona.moods.idle
    );
  });

  it("lets go of the stage when she is removed", async () => {
    await mount();
    harness.unmount();

    expect(stage.dispose).toHaveBeenCalled();
  });
});
