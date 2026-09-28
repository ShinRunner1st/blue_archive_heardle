import React, { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createHarness } from "../../test/harness";

import { students } from "../../constants/students";
import { saveVoiceRounds } from "../../helpers/storage";
import { useVoiceGame, VoiceGameState } from "../../hooks/useVoiceGame";
import { SKIPPED, VoiceRound, VoiceRoundMode } from "../../types/voice";
import { VoiceGame } from "./index";

vi.mock("../../helpers/audioSource", () => ({
  loadAudio: vi.fn((url: string) => Promise.resolve(`blob:${url}`)),
}));
vi.mock("../../helpers/voiceTexts", () => ({
  loadVoiceText: vi.fn(() => Promise.resolve("I'll protect you, Sensei.")),
}));

const byName = (name: string) => {
  const found = students.find((student) => student.name === name);
  if (!found) throw new Error(`no ${name}`);
  return found;
};
const hoshino = byName("Hoshino");
const aru = byName("Aru");
const hina = byName("Hina");

let harness: ReturnType<typeof createHarness>;
let game: VoiceGameState;

function Probe({ mode }: { mode: VoiceRoundMode }) {
  game = useVoiceGame(mode);
  return React.createElement(VoiceGame, {
    mode,
    game,
    keyboardEnabled: true,
  });
}

function mount(round: VoiceRound, mode: VoiceRoundMode = "endless") {
  saveVoiceRounds(mode, [round]);
  harness.render(React.createElement(Probe, { mode }));
}

function text() {
  return harness.container.textContent ?? "";
}

function button(label: string) {
  return Array.from(harness.container.querySelectorAll("button")).find(
    (b) => b.textContent === label || b.getAttribute("aria-label") === label
  );
}

function pressShiftEnter() {
  act(() => {
    window.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", shiftKey: true })
    );
  });
}

beforeEach(() => {
  localStorage.clear();
  harness = createHarness();
});

afterEach(() => {
  harness.destroy();
});

describe("VoiceGame", () => {
  it("keeps the answer off the page until its hints open", () => {
    mount({ answer: hoshino.id, line: 0, guesses: [] });

    expect(text()).toContain("After 1 miss");
    expect(text()).not.toContain(hoshino.name);
    expect(text()).not.toContain(hoshino.school);
    expect(text()).not.toContain(hoshino.club);
    expect(harness.container.querySelector('[aria-label*="silhouette"]')).toBe(
      null
    );
  });

  it("opens the school, then the club, then the silhouette", () => {
    mount({ answer: hoshino.id, line: 0, guesses: [] });

    act(() => game.guess(aru.id));
    expect(text()).toContain(aru.name);
    expect(text()).toContain(hoshino.school);
    expect(text()).not.toContain(hoshino.club);

    pressShiftEnter();
    expect(text()).toContain("Skipped");
    expect(text()).toContain(hoshino.club);

    act(() => button("Skip for a hint")!.click());
    expect(
      harness.container.querySelector('[aria-label*="silhouette"]')
    ).not.toBe(null);
    expect(button("Give up?")).toBeDefined();
  });

  it("picks a name first, and guesses it on Enter or Guess", () => {
    mount({ answer: hoshino.id, line: 0, guesses: [] });
    const input = harness.container.querySelector<HTMLInputElement>(
      'input[aria-label="Search for a student"]'
    )!;
    const type = (value: string) =>
      act(() => {
        Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype,
          "value"
        )!.set!.call(input, value);
        input.dispatchEvent(new Event("input", { bubbles: true }));
      });
    const enter = () =>
      act(() => {
        input.dispatchEvent(
          new KeyboardEvent("keydown", { key: "Enter", bubbles: true })
        );
      });

    expect(button("Guess")?.disabled).toBe(true);
    type("aru");
    enter();
    expect(game.round.guesses).toEqual([]);
    expect(input.value).toBe("Aru");
    expect(button("Guess")?.disabled).toBe(false);

    enter();
    expect(game.round.guesses).toEqual([aru.id]);
    expect(input.value).toBe("");

    type("hina");
    enter();
    act(() => button("Guess")!.click());
    expect(game.round.guesses).toEqual([aru.id, hina.id]);
  });

  it("shows no hints in No hints", () => {
    mount({ answer: hoshino.id, line: 0, guesses: [aru.id] }, "nohint");
    expect(text()).not.toContain("After 1 miss");
    expect(text()).not.toContain(hoshino.school);
    expect(button("Skip")).toBeDefined();
  });

  it("names the student and what they said once it's over", async () => {
    mount({ answer: hoshino.id, line: 1, guesses: [SKIPPED] });
    act(() => game.guess(hoshino.id));
    await act(async () => undefined);

    expect(text()).toContain(hoshino.name);
    expect(text()).toContain("in 2 tries");
    expect(text()).toContain("I'll protect you, Sensei.");
    expect(button("Next voice")).toBeDefined();
  });

  it("offers four students in 4-Choice, picked with a number key", () => {
    const choices = [aru.id, hoshino.id, hina.id, byName("Shiroko").id];
    mount({ answer: hoshino.id, line: 0, guesses: [], choices }, "choice");

    expect(text()).toContain(aru.name);
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "2" }));
    });
    expect(game.round.guesses).toEqual([hoshino.id]);
    expect(text()).toContain("Target acquired");
  });
});
