import React, { act } from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createHarness } from "./test/harness";

import App from "./app";
import { DAILY_STORAGE_KEY, MODE_KEY, STORAGE_KEY } from "./constants/game";
import { LATEST_UPDATE_ID } from "./constants/whatsNew";

/** The search boxes, not the players' volume and seek sliders. */
const TEXT_INPUT = "input:not([type=range])";

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
    expect(container.querySelectorAll(TEXT_INPUT)).toHaveLength(1);
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
    localStorage.setItem("whatsNew", LATEST_UPDATE_ID);
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

  it("switches to the student game and back, remembering it", () => {
    localStorage.setItem("firstRun", "false");
    localStorage.setItem("whatsNew", LATEST_UPDATE_ID);
    mount();
    const click = (label: string) =>
      act(() => {
        Array.from(container.querySelectorAll("button"))
          .find(
            (button) =>
              button.textContent === label ||
              button.getAttribute("aria-label") === label
          )
          ?.click();
      });
    const search = () =>
      container.querySelector(TEXT_INPUT)?.getAttribute("aria-label");

    click("Students");
    expect(search()).toBe("Search for a student");
    expect(container.textContent).toContain("Guess the Blue Archive student");

    click("Lore");
    click("Endless");
    harness.unmount();
    mount();
    expect(search()).toBe("Search for a student");
    expect(
      container.querySelector('[aria-pressed="true"][title^="Height"]')
    ).not.toBeNull();

    click("OST");
    expect(search()).toBe("Search for a song");
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

  it("shows the ways to play Endless only in Endless", () => {
    mount();
    expect(modeButton("4-Choice")).toBeUndefined();

    act(() => {
      modeButton("Endless")!.click();
    });

    expect(modeButton("Classic")?.getAttribute("aria-pressed")).toBe("true");
    expect(modeButton("4-Choice")?.getAttribute("aria-pressed")).toBe("false");
  });

  it("plays the picture game, halo or weapon, and remembers which", () => {
    localStorage.setItem("whatsNew", LATEST_UPDATE_ID);
    mount();
    act(() => {
      container
        .querySelector<HTMLButtonElement>('button[aria-label="Picture"]')!
        .click();
    });

    expect(localStorage.getItem("game")).toBe("picture");
    expect(container.querySelector('[aria-label="The halo"]')).not.toBeNull();
    // Daily shows the picture itself, never its silhouette.
    expect(modeButton("Silhouette")).toBeUndefined();

    act(() => {
      modeButton("Weapon")!.click();
    });
    expect(container.querySelector('[aria-label="The weapon"]')).not.toBeNull();
    expect(localStorage.getItem("pictureKind")).toBe("weapon");

    act(() => {
      modeButton("Endless")!.click();
    });
    act(() => {
      modeButton("Silhouette")!.click();
    });
    expect(localStorage.getItem("pictureStyle")).toBe("silhouette");
    expect(
      container.querySelector(`[aria-label="The weapon's silhouette"]`)
    ).not.toBeNull();
    expect(container.querySelector('[aria-label="The weapon"]')).toBeNull();

    act(() => {
      modeButton("Hints")!.click();
    });
    expect(localStorage.getItem("pictureStyle")).toBe("silhouette-nohint");
    expect(container.querySelector('[aria-label="Hints"]')).toBeNull();

    // 4-Choice keeps a silhouette of its own; Classic remembers its mix.
    act(() => {
      modeButton("4-Choice")!.click();
    });
    expect(localStorage.getItem("pictureStyle")).toBe("choice");
    expect(modeButton("Hints")).toBeUndefined();
    act(() => {
      modeButton("Silhouette")!.click();
    });
    expect(localStorage.getItem("pictureStyle")).toBe("choice-silhouette");
    act(() => {
      modeButton("Classic")!.click();
    });
    expect(localStorage.getItem("pictureStyle")).toBe("silhouette-nohint");
  });

  it("plays four-choice, and goes back to it from Daily", () => {
    localStorage.setItem("whatsNew", LATEST_UPDATE_ID);
    mount();
    act(() => {
      modeButton("Endless")!.click();
    });
    act(() => {
      modeButton("4-Choice")!.click();
    });

    expect(localStorage.getItem(MODE_KEY)).toBe("choice");
    expect(container.querySelector('[aria-label="Answers"]')).not.toBeNull();
    // No search box: the answer is picked from four.
    expect(container.querySelectorAll(TEXT_INPUT)).toHaveLength(0);

    act(() => {
      modeButton("Daily")!.click();
    });
    act(() => {
      modeButton("Endless")!.click();
    });

    expect(modeButton("4-Choice")?.getAttribute("aria-pressed")).toBe("true");
  });

  it("ends a time attack run when the player leaves for another mode", () => {
    localStorage.setItem("whatsNew", LATEST_UPDATE_ID);
    mount();
    act(() => {
      modeButton("Endless")!.click();
    });
    act(() => {
      modeButton("Time Attack")!.click();
    });
    act(() => {
      modeButton("Start")!.click();
    });
    expect(container.querySelector('[role="timer"]')).not.toBeNull();

    act(() => {
      modeButton("Classic")!.click();
    });
    act(() => {
      modeButton("Time Attack")!.click();
    });

    expect(container.textContent).toContain("Time's up, Sensei!");
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
