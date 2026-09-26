import { describe, expect, it, vi } from "vitest";

import { CHARACTER_KEY } from "../constants/game";
import {
  getCharacterChoice,
  setCharacterChoice,
  subscribeCharacterChoice,
} from "./characterChoice";

describe("character choice", () => {
  it("starts on Arona and Plana", () => {
    expect(getCharacterChoice()).toBe("auto");
  });

  it("saves a pick and tells listeners", () => {
    const listener = vi.fn();
    subscribeCharacterChoice(listener);

    setCharacterChoice("mari");

    expect(getCharacterChoice()).toBe("mari");
    expect(localStorage.getItem(CHARACTER_KEY)).toBe("mari");
    expect(listener).toHaveBeenCalled();
  });

  it("ignores a junk saved value", () => {
    localStorage.setItem(CHARACTER_KEY, "yuuka");

    expect(getCharacterChoice()).toBe("auto");
  });
});
