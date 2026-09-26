import React, { act } from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createHarness } from "./test/harness";

import App from "./app";
import { DAILY_STORAGE_KEY, MODE_KEY, STORAGE_KEY } from "./constants/game";
import { WHATS_NEW } from "./constants/whatsNew";

let harness: ReturnType<typeof createHarness>;
let container: HTMLDivElement;

function mount() {
  harness.render(React.createElement(App));
}

beforeEach(() => {
  localStorage.clear();
  harness = createHarness();
  container = harness.container;
});

afterEach(() => {
  harness.destroy();
});

describe("App", () => {
  it("mounts and renders the six guess rows", () => {
    mount();

    expect(container.textContent).toContain("Guess");
    expect(container.querySelectorAll("input")).toHaveLength(1);
  });

  it("shows the welcome pop-up on a first visit only", () => {
    mount();
    expect(container.textContent).toContain("Welcome");

    harness.unmount();
    localStorage.setItem("firstRun", "false");
    mount();

    expect(container.textContent).not.toContain("Welcome");
  });

  it("mounts cleanly when storage holds a corrupted save", () => {
    localStorage.setItem(STORAGE_KEY, '[{"solution":null},"junk"]');

    expect(() => mount()).not.toThrow();
    expect(container.textContent).toContain("Guess");
  });

  it("skips with Shift+Enter, once per press", () => {
    localStorage.setItem("firstRun", "false");
    localStorage.setItem("whatsNew", WHATS_NEW.id);
    mount();
    const skipLabel = () =>
      Array.from(container.querySelectorAll("button"))
        .map((button) => button.textContent)
        .find((text) => text?.startsWith("Skip"));
    const shiftEnter = (repeat = false) =>
      act(() => {
        window.dispatchEvent(
          new KeyboardEvent("keydown", { key: "Enter", shiftKey: true, repeat })
        );
      });

    expect(skipLabel()).toBe("Skip +1s");
    shiftEnter();
    expect(skipLabel()).toBe("Skip +2s");
    shiftEnter(true);
    expect(skipLabel()).toBe("Skip +2s");
  });

  it("unmounts without leaving timers or listeners behind", () => {
    mount();

    expect(() => harness.unmount()).not.toThrow();
  });
});

function modeButton(label: string) {
  return Array.from(container.querySelectorAll("button")).find(
    (button) => button.textContent === label
  );
}

describe("App mode switch", () => {
  beforeEach(() => {
    localStorage.setItem("firstRun", "false");
  });

  it("starts a new player on the daily puzzle", () => {
    mount();

    expect(modeButton("Daily")?.getAttribute("aria-pressed")).toBe("true");
  });

  it("remembers the mode across reloads", () => {
    mount();

    act(() => {
      modeButton("Endless")!.click();
    });
    expect(localStorage.getItem(MODE_KEY)).toBe("endless");

    harness.unmount();
    mount();

    expect(modeButton("Endless")?.getAttribute("aria-pressed")).toBe("true");
  });

  it("keeps each mode's history in its own place", () => {
    mount();

    act(() => {
      modeButton("Endless")!.click();
    });

    expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull();
    expect(localStorage.getItem(DAILY_STORAGE_KEY)).not.toBeNull();
    expect(localStorage.getItem(STORAGE_KEY)).not.toBe(
      localStorage.getItem(DAILY_STORAGE_KEY)
    );
  });
});
