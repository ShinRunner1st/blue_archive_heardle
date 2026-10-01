import React, { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Header } from "./index";
import { createHarness } from "../../test/harness";
import { GameMode } from "../../types/mode";

let harness: ReturnType<typeof createHarness>;
const openInfoPopUp = vi.fn();
const openStatsPopUp = vi.fn();
const openHowToPopUp = vi.fn();
const openSettingsPopUp = vi.fn();
const openBadgesPopUp = vi.fn();
const openMissionsPopUp = vi.fn();
const openWhatsNewPopUp = vi.fn();
const openJukeboxPopUp = vi.fn();
const openSenseiCard = vi.fn();
const onModeChange = vi.fn();

function buttonFor(label: string) {
  return harness.container.querySelector<HTMLButtonElement>(
    `button[aria-label="${label}"]`
  );
}

/** Items inside the menu are named by their text, like any menu entry. */
function menuItem(text: string) {
  return Array.from(
    harness.container.querySelectorAll<HTMLButtonElement>("button")
  ).find((button) => button.textContent?.trim() === text);
}

function openMenu() {
  act(() => buttonFor("Menu")!.click());
}

function modeButton(label: string) {
  return Array.from(
    harness.container.querySelectorAll<HTMLButtonElement>("button")
  ).find((button) => button.textContent === label);
}

const onHome = vi.fn();

function mount(mode: GameMode = "daily", streak = 0, isHub = false) {
  harness.render(
    React.createElement(Header, {
      openInfoPopUp,
      openStatsPopUp,
      openHowToPopUp,
      openSettingsPopUp,
      openBadgesPopUp,
      openMissionsPopUp,
      openWhatsNewPopUp,
      openJukeboxPopUp,
      openSenseiCard,
      mode,
      onModeChange,
      streak,
      tagline: "Guess the Blue Archive OST",
      isHub,
      onHome,
    })
  );
}

beforeEach(() => {
  harness = createHarness();
  mount();
});

afterEach(() => {
  harness.destroy();
  vi.clearAllMocks();
});

describe("Header", () => {
  // These were bare <svg onClick> elements, unreachable by keyboard and
  // unnamed for screen readers.
  it("keeps only the everyday controls on the bar", () => {
    // Stats and the menu, plus the two mode buttons.
    expect(harness.container.querySelectorAll("button")).toHaveLength(4);
    expect(buttonFor("Your stats")).not.toBeNull();
    expect(buttonFor("Menu")).not.toBeNull();
  });

  it("opens stats straight from the bar", () => {
    buttonFor("Your stats")!.click();
    expect(openStatsPopUp).toHaveBeenCalled();
  });

  it("keeps the icons out of the accessibility tree", () => {
    harness.container.querySelectorAll("svg").forEach((icon) => {
      expect(icon.getAttribute("aria-hidden")).toBe("true");
    });
  });

  // A game's page is about the game, so its tagline is the heading.
  it("gives a game's page a single level-one heading, its tagline", () => {
    const headings = harness.container.querySelectorAll("h1");

    expect(headings).toHaveLength(1);
    expect(headings[0].textContent).toBe("Guess the Blue Archive OST");
  });

  // On the hub the wordmark is, so its alt text has to stand in for it.
  it("gives the hub a single level-one heading, named by the wordmark", () => {
    mount("daily", 3, true);
    const headings = harness.container.querySelectorAll("h1");

    expect(headings).toHaveLength(1);
    expect(headings[0].querySelector("img")?.getAttribute("alt")).toBe(
      "Blue Archive Heardle"
    );
  });

  it("has no game's controls on the hub", () => {
    mount("daily", 3, true);

    expect(buttonFor("Your stats")).toBeNull();
    expect(modeButton("Daily")).toBeUndefined();
    expect(harness.container.querySelector('[role="img"]')).toBeNull();
    expect(buttonFor("Menu")).not.toBeNull();
  });

  it("links the wordmark to the hub, moving there in place", () => {
    const link = harness.container.querySelector<HTMLAnchorElement>("a")!;
    expect(link.getAttribute("href")).toBe("/");

    const click = new MouseEvent("click", { bubbles: true, cancelable: true });
    act(() => {
      link.dispatchEvent(click);
    });
    expect(onHome).toHaveBeenCalled();
    expect(click.defaultPrevented).toBe(true);
  });

  it("leaves a click with a modifier key to the browser", () => {
    const link = harness.container.querySelector<HTMLAnchorElement>("a")!;
    const click = new MouseEvent("click", {
      bubbles: true,
      cancelable: true,
      ctrlKey: true,
    });
    link.dispatchEvent(click);

    expect(onHome).not.toHaveBeenCalled();
    expect(click.defaultPrevented).toBe(false);
  });
});

describe("Header streak", () => {
  it("shows a running daily streak", () => {
    mount("daily", 4);

    const streak = harness.container.querySelector('[role="img"]');
    expect(streak?.textContent).toContain("4");
    expect(streak?.getAttribute("aria-label")).toBe("4 day streak");
  });

  it("stays out of the way when there is no streak yet", () => {
    mount("daily", 0);

    expect(harness.container.querySelector('[role="img"]')).toBeNull();
  });

  it("shows the endless win streak in endless mode", () => {
    mount("endless", 4);

    const streak = harness.container.querySelector('[role="img"]');
    expect(streak?.getAttribute("aria-label")).toBe("4 wins in a row");
  });
});

describe("Header mode switch", () => {
  it("marks the active mode as pressed", () => {
    expect(modeButton("Daily")?.getAttribute("aria-pressed")).toBe("true");
    expect(modeButton("Endless")?.getAttribute("aria-pressed")).toBe("false");

    mount("endless");

    expect(modeButton("Daily")?.getAttribute("aria-pressed")).toBe("false");
    expect(modeButton("Endless")?.getAttribute("aria-pressed")).toBe("true");
  });

  it("keeps Endless lit for every way to play it", () => {
    mount("choice");

    expect(modeButton("Daily")?.getAttribute("aria-pressed")).toBe("false");
    expect(modeButton("Endless")?.getAttribute("aria-pressed")).toBe("true");
  });

  it("reports the mode the player picked", () => {
    modeButton("Endless")!.click();
    expect(onModeChange).toHaveBeenCalledWith("endless");

    modeButton("Daily")!.click();
    expect(onModeChange).toHaveBeenCalledWith("daily");
  });

  // The marker is one element that slides, so the two buttons must not each
  // carry their own background - that would show two green pills mid-animation.
  it("moves a single active marker rather than recolouring both buttons", () => {
    const thumb = () =>
      harness.container.querySelector<HTMLElement>('[aria-hidden="true"]')!;

    const daily = getComputedStyle(thumb()).transform;

    mount("endless");
    const endless = getComputedStyle(thumb()).transform;

    expect(daily).toBe("translateX(0%)");
    expect(endless).toBe("translateX(100%)");
    // Transparent: the pill behind them is the only green.
    expect(getComputedStyle(modeButton("Daily")!).backgroundColor).toBe(
      "rgba(0, 0, 0, 0)"
    );
  });

  it("names the group for screen readers", () => {
    const group = harness.container.querySelector('[role="group"]');
    expect(group?.getAttribute("aria-label")).toBe("Game mode");
  });
});

describe("Header menu", () => {
  it("starts closed and says so", () => {
    expect(buttonFor("Menu")?.getAttribute("aria-expanded")).toBe("false");
    expect(menuItem("How to play")).toBeUndefined();
  });

  it("lists the less-used controls when opened", () => {
    openMenu();

    expect(buttonFor("Menu")?.getAttribute("aria-expanded")).toBe("true");
    expect(menuItem("How to play")).toBeDefined();
    expect(menuItem("Dark mode")).toBeDefined();
    expect(menuItem("Settings")).toBeDefined();
    expect(menuItem("About this game")).toBeDefined();
  });

  it("opens a pop-up from the menu and closes itself", () => {
    openMenu();
    act(() => menuItem("How to play")!.click());

    expect(openHowToPopUp).toHaveBeenCalled();
    expect(menuItem("About this game")).toBeUndefined();

    openMenu();
    act(() => menuItem("About this game")!.click());

    expect(openInfoPopUp).toHaveBeenCalled();

    openMenu();
    act(() => menuItem("Settings")!.click());

    expect(openSettingsPopUp).toHaveBeenCalled();

    openMenu();
    act(() => menuItem("What's new")!.click());

    expect(openWhatsNewPopUp).toHaveBeenCalled();
  });

  it("opens the Jukebox from the menu", () => {
    mount();
    openMenu();

    act(() => menuItem("Jukebox")!.click());

    expect(openJukeboxPopUp).toHaveBeenCalled();
  });

  it("opens the OST badges from the menu", () => {
    openMenu();
    act(() => menuItem("OST badges")!.click());

    expect(openBadgesPopUp).toHaveBeenCalled();
  });

  it("closes on a tap outside it", () => {
    openMenu();

    act(() => {
      document.body.dispatchEvent(new Event("pointerdown", { bubbles: true }));
    });

    expect(menuItem("How to play")).toBeUndefined();
  });

  it("closes on Escape and hands focus back to the toggle", () => {
    openMenu();

    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });

    expect(menuItem("How to play")).toBeUndefined();
    expect(document.activeElement).toBe(buttonFor("Menu"));
  });
});

describe("Header dark mode switch", () => {
  it("switches to dark and back, and remembers the choice", () => {
    openMenu();
    const toggle = () => menuItem("Dark mode")!;
    expect(toggle().getAttribute("aria-checked")).toBe("false");

    act(() => toggle().click());

    expect(toggle().getAttribute("aria-checked")).toBe("true");
    expect(localStorage.getItem("colorScheme")).toBe("dark");

    act(() => toggle().click());

    expect(toggle().getAttribute("aria-checked")).toBe("false");
    expect(localStorage.getItem("colorScheme")).toBe("light");
  });
});
