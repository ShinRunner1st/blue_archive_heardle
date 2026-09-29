import React, { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createHarness } from "./test/harness";

import App from "./app";
import { DAILY_STORAGE_KEY, MODE_KEY, STORAGE_KEY } from "./constants/game";
import { LATEST_UPDATE_ID } from "./constants/whatsNew";
import { songs } from "./constants";
import { setServer } from "./helpers/server";
import { emptyGuesses, saveRounds } from "./helpers/storage";
import { students } from "./constants/students";

/** The search boxes, not the players' volume and seek sliders. */
const TEXT_INPUT = "input:not([type=range])";

let harness: ReturnType<typeof createHarness>;
let container: HTMLDivElement;

function mount() {
  harness.render(React.createElement(App));
}

beforeEach(() => {
  localStorage.clear();
  // The OST's page: the root is the hub, tested on its own below.
  window.history.replaceState(null, "", "/ost");
  harness = createHarness();
  container = harness.container;
});

afterEach(() => {
  harness.destroy();
  window.history.replaceState(null, "", "/");
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

  it("switches to the student game's page and back", () => {
    localStorage.setItem("firstRun", "false");
    localStorage.setItem("whatsNew", LATEST_UPDATE_ID);
    mount();
    const click = (label: string) =>
      act(() => {
        Array.from(container.querySelectorAll<HTMLElement>("button, a"))
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
    expect(window.location.pathname).toBe("/students");

    // A reload stays on the page, with its way to play and mode.
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
    expect(window.location.pathname).toBe("/ost");
  });

  it("unmounts without leaving timers or listeners behind", () => {
    mount();

    expect(() => harness.unmount()).not.toThrow();
  });
});

describe("App hub", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/");
    localStorage.setItem("whatsNew", LATEST_UPDATE_ID);
  });

  const card = (name: string) =>
    Array.from(container.querySelectorAll<HTMLAnchorElement>("li a")).find(
      (link) => link.querySelector("h2")?.textContent === name
    );

  it("shows a card for each game, linking to its page", () => {
    mount();

    expect(container.querySelector(TEXT_INPUT)).toBeNull();
    expect(
      ["OST", "Voice", "Students", "Picture"].map((name) =>
        card(name)?.getAttribute("href")
      )
    ).toEqual(["/ost", "/voice", "/students", "/picture"]);
    expect(document.title).toContain("Guess the OST, Voices");
  });

  it("lists the games in the same order on the bar and the cards", () => {
    mount();
    const bar = Array.from(
      container.querySelectorAll<HTMLAnchorElement>("nav a")
    ).map((link) => link.getAttribute("href"));
    const cards = Array.from(
      container.querySelectorAll<HTMLAnchorElement>("li a")
    ).map((link) => link.getAttribute("href"));

    expect(bar).toEqual(["/", "/ost", "/voice", "/picture", "/students"]);
    expect(cards).toEqual(bar.slice(1));
  });

  it("welcomes a new player on the first game, not the hub", () => {
    mount();
    expect(container.textContent).not.toContain("Welcome");
    expect(container.textContent).not.toContain("Continue");

    act(() => card("Voice")!.click());

    expect(window.location.pathname).toBe("/voice");
    expect(document.title).toContain("by Voice");
    expect(container.textContent).toContain("Welcome");
  });

  it("goes back to the hub with Back, and offers to continue", () => {
    localStorage.setItem("firstRun", "false");
    mount();
    act(() => card("Students")!.click());
    expect(container.querySelector(TEXT_INPUT)).not.toBeNull();

    // Back, as the browser does it: the address changes, then popstate.
    act(() => {
      window.history.replaceState(null, "", "/");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });

    expect(container.querySelector(TEXT_INPUT)).toBeNull();
    const resume = Array.from(container.querySelectorAll("a")).find((link) =>
      link.textContent?.includes("Continue")
    );
    expect(resume?.textContent).toContain("Students");
    expect(resume?.getAttribute("href")).toBe("/students");
  });

  it("shows the player's record once they have played", () => {
    mount();
    expect(container.textContent).not.toContain("Your record");

    harness.unmount();
    saveRounds(
      [
        {
          solution: songs[0],
          currentTry: 2,
          didGuess: true,
          guesses: emptyGuesses(),
          startTime: 0,
        },
      ],
      "endless"
    );
    mount();

    expect(container.textContent).toContain("Your record");
    expect(container.textContent).toContain(`1/${songs.length}`);
  });

  it("shows what is on in Global, from the Worker, and nothing if it fails", async () => {
    const now = Math.floor(Date.now() / 1000);
    const fetchNow = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        banners: [],
        events: [{ name: "Lore Pursuit", start: now - 60, end: now + 7200 }],
        raids: [{ kind: "Total Assault", start: now - 60, end: now - 1 }],
      }),
    }));
    vi.stubGlobal("fetch", fetchNow);
    await act(async () => mount());

    expect(fetchNow).toHaveBeenCalledWith("/now/now.json");
    expect(container.textContent).toContain("Now in Global");
    expect(container.textContent).toContain("Lore Pursuit");
    // Over already: left out.
    expect(container.textContent).not.toContain("Total Assault");

    // The JP server's, from the same file, with no new request.
    act(() => setServer("jp"));
    expect(container.textContent).not.toContain("Now in");
    setServer("global");

    harness.unmount();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("offline");
      })
    );
    await act(async () => mount());

    expect(container.textContent).not.toContain("Now in Global");
    vi.unstubAllGlobals();
  });

  it("plays the JP server's students once it is picked", () => {
    const jpOnly = students.find((student) => !student.global && student.lore)!;
    localStorage.setItem("firstRun", "false");
    window.history.replaceState(null, "", "/students");
    const names = () => {
      act(() =>
        container
          .querySelector<HTMLButtonElement>(
            '[aria-label="Browse all students"]'
          )
          ?.click()
      );
      const found = Array.from(
        document.querySelectorAll<HTMLButtonElement>(
          '[role="dialog"] button[title]'
        )
      ).map((tile) => tile.title);
      act(() => {
        document.dispatchEvent(
          new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
        );
      });
      return found;
    };

    mount();
    expect(container.textContent).not.toContain("JP server");
    expect(names()).not.toContain(jpOnly.name);

    // Switched in place: the page doesn't start over, the game does.
    const page = container.firstElementChild;
    act(() => setServer("jp"));
    expect(container.firstElementChild).toBe(page);
    expect(container.textContent).toContain("JP server");
    expect(names()).toContain(jpOnly.name);
  });

  it("links home from every game's navigation bar", () => {
    window.history.replaceState(null, "", "/picture");
    localStorage.setItem("firstRun", "false");
    mount();

    const home = container.querySelector<HTMLAnchorElement>(
      'nav a[aria-label="Home"]'
    )!;
    expect(home.getAttribute("href")).toBe("/");
    act(() => home.click());

    expect(window.location.pathname).toBe("/");
    expect(card("OST")).toBeDefined();
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
        .querySelector<HTMLAnchorElement>('a[aria-label="Picture"]')!
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
