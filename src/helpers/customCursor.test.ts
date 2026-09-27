import { afterEach, describe, expect, it, vi } from "vitest";

import { CUSTOM_CURSOR_KEY } from "../constants/game";
import {
  applyCustomCursorToDocument,
  getCustomCursor,
  setCustomCursor,
  subscribeCustomCursor,
} from "./customCursor";

const stop = vi.fn();
const start = vi.fn(() => stop);

// jsdom has no canvas; what matters is when the effects start and stop.
vi.mock("./cursorEffects", () => ({ startCursorEffects: () => start() }));

const cursorAttribute = () => document.documentElement.dataset.cursor;

describe("custom cursor", () => {
  afterEach(() => {
    start.mockClear();
    stop.mockClear();
  });

  it("puts the cursor back after a browser window of its own closes", async () => {
    vi.useFakeTimers();
    applyCustomCursorToDocument(true);
    await vi.dynamicImportSettled();

    window.dispatchEvent(new Event("focus"));
    expect(cursorAttribute()).toBeUndefined();

    vi.advanceTimersToNextFrame();
    vi.advanceTimersToNextFrame();
    expect(cursorAttribute()).toBe("custom");
    vi.useRealTimers();
  });

  it("leaves a cursor turned off alone when the page comes back", () => {
    applyCustomCursorToDocument(false);

    window.dispatchEvent(new Event("focus"));

    expect(cursorAttribute()).toBeUndefined();
  });

  it("is on for a new player", () => {
    expect(getCustomCursor()).toBe(true);
  });

  it("shows the cursor and runs the effects while on", async () => {
    applyCustomCursorToDocument(true);
    expect(cursorAttribute()).toBe("custom");

    await vi.dynamicImportSettled();
    expect(start).toHaveBeenCalledTimes(1);

    // Applying it again doesn't start a second copy.
    applyCustomCursorToDocument(true);
    await vi.dynamicImportSettled();
    expect(start).toHaveBeenCalledTimes(1);
  });

  it("never starts the effects if turned off while they load", async () => {
    applyCustomCursorToDocument(true);
    applyCustomCursorToDocument(false);
    await vi.dynamicImportSettled();

    expect(start).not.toHaveBeenCalled();
  });

  it("turns everything off, and remembers it", async () => {
    applyCustomCursorToDocument(true);
    await vi.dynamicImportSettled();
    const listener = vi.fn();
    subscribeCustomCursor(listener);

    setCustomCursor(false);

    expect(cursorAttribute()).toBeUndefined();
    expect(stop).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem(CUSTOM_CURSOR_KEY)).toBe("false");
    expect(listener).toHaveBeenCalled();
  });

  it("stays off for a player who turned it off", () => {
    localStorage.setItem(CUSTOM_CURSOR_KEY, "false");

    expect(getCustomCursor()).toBe(false);
  });
});
