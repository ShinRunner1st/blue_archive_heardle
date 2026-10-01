import React, { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  CHARACTER_KEY,
  CUSTOM_CURSOR_KEY,
  FIRST_RUN_KEY,
} from "../../constants/game";
import { obscure } from "../../helpers/obscure";
import { withoutStamp } from "../../helpers/roundId";
import { downloadText, reloadPage } from "../../helpers/saveFile";
import { emptyGuesses, loadRounds, saveRounds } from "../../helpers/storage";
import { createHarness } from "../../test/harness";

import { SettingsPopUp } from "./index";

// jsdom has no canvas, so the effects themselves are stubbed out.
vi.mock("../../helpers/cursorEffects", () => ({
  startCursorEffects: () => () => {},
}));

// jsdom can't download files or reload the page.
vi.mock("../../helpers/saveFile", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../helpers/saveFile")>()),
  downloadText: vi.fn(),
  reloadPage: vi.fn(),
}));

let harness: ReturnType<typeof createHarness>;
const onClose = vi.fn();

const cursorSwitch = () =>
  harness.container.querySelector<HTMLButtonElement>('[role="switch"]')!;

describe("SettingsPopUp", () => {
  beforeEach(() => {
    harness = createHarness();
    harness.render(React.createElement(SettingsPopUp, { onClose }));
  });

  afterEach(() => {
    harness.destroy();
  });

  it("shows the Blue Archive cursor as on, with what it does", () => {
    expect(cursorSwitch().getAttribute("aria-checked")).toBe("true");
    expect(cursorSwitch().textContent).toContain("Blue Archive cursor");
    expect(cursorSwitch().textContent).toContain("use your own cursor");
  });

  it("turns the cursor off and back on", async () => {
    act(() => cursorSwitch().click());

    expect(cursorSwitch().getAttribute("aria-checked")).toBe("false");
    expect(localStorage.getItem(CUSTOM_CURSOR_KEY)).toBe("false");
    expect(document.documentElement.dataset.cursor).toBeUndefined();

    act(() => cursorSwitch().click());

    expect(cursorSwitch().getAttribute("aria-checked")).toBe("true");
    expect(document.documentElement.dataset.cursor).toBe("custom");
    await vi.dynamicImportSettled();
  });

  it("picks the character, or none", () => {
    const option = (label: string) =>
      [
        ...harness.container.querySelectorAll<HTMLButtonElement>(
          '[role="radio"]'
        ),
      ].find((radio) => radio.textContent === label)!;

    expect(option("Arona & Plana").getAttribute("aria-checked")).toBe("true");

    act(() => option("Mari").click());
    expect(option("Mari").getAttribute("aria-checked")).toBe("true");
    expect(localStorage.getItem(CHARACTER_KEY)).toBe("mari");

    act(() => option("Off").click());
    expect(localStorage.getItem(CHARACTER_KEY)).toBe("off");
  });
});

describe("SettingsPopUp save file", () => {
  const song = { artist: "Mitsukiyo", name: "Constant Moderato", themeNo: "1" };
  const round = (day?: number) => ({
    solution: song,
    currentTry: 1,
    didGuess: true,
    guesses: emptyGuesses(),
    startTime: 0,
    ...(day === undefined ? {} : { day }),
  });

  const button = (label: string) =>
    [...harness.container.querySelectorAll("button")].find(
      (b) => b.textContent === label
    );
  const fileInput = () =>
    harness.container.querySelector<HTMLInputElement>('input[type="file"]')!;
  const text = () => harness.container.textContent ?? "";

  async function pick(contents: string) {
    const file = new File([contents], "save.txt", { type: "text/plain" });
    // jsdom's File has no text(); every browser the game supports does.
    file.text = () => Promise.resolve(contents);
    Object.defineProperty(fileInput(), "files", {
      value: [file],
      configurable: true,
    });
    await act(async () => {
      fileInput().dispatchEvent(new Event("change", { bubbles: true }));
    });
  }

  beforeEach(() => {
    localStorage.clear();
    vi.mocked(downloadText).mockClear();
    vi.mocked(reloadPage).mockClear();
    harness = createHarness();
    harness.render(React.createElement(SettingsPopUp, { onClose }));
  });

  afterEach(() => {
    harness.destroy();
  });

  it("exports every mode to a dated file", () => {
    saveRounds([round()], "endless");
    act(() => button("Export")!.click());

    const [name, contents] = vi.mocked(downloadText).mock.calls[0];
    expect(name).toMatch(/^baheardle-save-\d{4}-\d{2}-\d{2}\.txt$/);
    expect(contents).not.toContain("Constant Moderato");
  });

  it("asks before replacing, then loads the save", async () => {
    saveRounds([round()], "endless");
    const save = obscure(
      JSON.stringify({
        app: "baheardle",
        version: 1,
        exported: "2026-09-28T10:00:00Z",
        rounds: { daily: [round(1), round(2)], endless: [] },
      })
    );

    await pick(save);

    expect(text()).toContain("2 daily puzzles and 0 endless songs");
    expect(loadRounds("endless")).toHaveLength(1);

    act(() => button("Replace")!.click());

    // Imported with ids, so the rounds merge cleanly with copies of them.
    expect(loadRounds("daily").map(withoutStamp)).toEqual([round(1), round(2)]);
    expect(loadRounds("daily").every((each) => each.id)).toBe(true);
    expect(loadRounds("endless")).toEqual([]);
    expect(localStorage.getItem(FIRST_RUN_KEY)).toBe("false");
    expect(reloadPage).toHaveBeenCalledOnce();
  });

  it("keeps the progress here when the import is cancelled", async () => {
    saveRounds([round()], "endless");
    await pick(
      obscure(
        JSON.stringify({
          app: "baheardle",
          version: 1,
          rounds: { daily: [round(1)] },
        })
      )
    );

    act(() => button("Cancel")!.click());

    expect(loadRounds("endless")).toHaveLength(1);
    expect(button("Export")).toBeDefined();
    expect(reloadPage).not.toHaveBeenCalled();
  });

  it("says so when the file isn't a save", async () => {
    await pick("a shopping list");

    const alert = harness.container.querySelector('[role="alert"]');
    expect(alert?.textContent).toBe(
      "That file isn't a Blue Archive Heardle save."
    );
    expect(button("Replace")).toBeUndefined();
  });
});

describe("SettingsPopUp reset", () => {
  const onReset = vi.fn();
  const text = () => document.body.textContent ?? "";
  const button = (label: string) =>
    Array.from(document.querySelectorAll<HTMLButtonElement>("button")).find(
      (b) => b.textContent === label
    );

  function mount(canReset = true, withTarget = true) {
    harness.render(
      React.createElement(SettingsPopUp, {
        onClose,
        reset: withTarget
          ? { name: "Voice · 4-Choice", canReset, onReset }
          : undefined,
      })
    );
  }

  beforeEach(() => {
    harness = createHarness();
    onReset.mockClear();
  });

  afterEach(() => {
    harness.destroy();
  });

  it("names the game and mode it clears, and asks twice", () => {
    mount();
    expect(text()).toContain(
      "Clears the rounds, stats and streak of Voice · 4-Choice"
    );

    act(() => button("Reset")!.click());
    expect(onReset).not.toHaveBeenCalled();
    expect(text()).toContain("can't be undone");

    act(() => button("Cancel")!.click());
    expect(button("Reset for good")).toBeUndefined();

    act(() => button("Reset")!.click());
    act(() => button("Reset for good")!.click());
    expect(onReset).toHaveBeenCalledTimes(1);
    expect(text()).toContain("Voice · 4-Choice starts over.");
  });

  it("has no button when there is nothing to clear", () => {
    mount(false);

    expect(button("Reset")).toBeUndefined();
    expect(text()).toContain("Nothing to reset here yet.");
  });

  it("leaves the card out on the hub, which has no game on screen", () => {
    mount(true, false);

    expect(text()).not.toContain("Reset stats");
  });
});
