import React, { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  CHARACTER_KEY,
  CUSTOM_CURSOR_KEY,
  FIRST_RUN_KEY,
  PLAYER_NAME_KEY,
} from "../../constants/game";
import { obscure } from "../../helpers/obscure";
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

  it("keeps the name for shared pictures", () => {
    const input =
      harness.container.querySelector<HTMLInputElement>('input[type="text"]')!;

    act(() => {
      Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value"
      )!.set!.call(input, "Hoshino");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });

    expect(input.value).toBe("Hoshino");
    expect(localStorage.getItem(PLAYER_NAME_KEY)).toBe("Hoshino");
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

    expect(loadRounds("daily")).toEqual([round(1), round(2)]);
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
