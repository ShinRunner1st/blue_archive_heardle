import React, { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createHarness } from "../../test/harness";

import { Search } from "./index";
import { songs } from "../../constants";

let harness: ReturnType<typeof createHarness>;
let container: HTMLDivElement;
let selected: unknown;
const setSelectedSong = vi.fn((next) => {
  selected = typeof next === "function" ? next(selected) : next;
});

function mount(currentTry = 0) {
  const inputRef = React.createRef<HTMLInputElement>();
  harness.render(
    React.createElement(Search, {
      currentTry,
      setSelectedSong,
      selectedSong: undefined,
      inputRef,
    })
  );
  return inputRef;
}

function input() {
  return container.querySelector("input")!;
}

function type(text: string) {
  act(() => {
    const el = input();
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      "value"
    )!.set!;
    setter.call(el, text);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

function press(key: string) {
  act(() => {
    input().dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
  });
}

function options() {
  return Array.from(container.querySelectorAll('[role="option"]'));
}

function activeOptionText() {
  const id = input().getAttribute("aria-activedescendant");
  return id ? document.getElementById(id)?.textContent : undefined;
}

beforeEach(() => {
  harness = createHarness();
  container = harness.container;
  selected = undefined;
});

afterEach(() => {
  harness.destroy();
  vi.clearAllMocks();
});

describe("Search combobox semantics", () => {
  it("marks the input as a combobox controlling the listbox", () => {
    mount();

    const el = input();
    expect(el.getAttribute("role")).toBe("combobox");
    expect(el.getAttribute("aria-autocomplete")).toBe("list");

    const listboxId = el.getAttribute("aria-controls");
    expect(document.getElementById(listboxId!)?.getAttribute("role")).toBe(
      "listbox"
    );
  });

  it("reports collapsed until results appear", () => {
    mount();
    expect(input().getAttribute("aria-expanded")).toBe("false");

    type("mitsukiyo");
    expect(input().getAttribute("aria-expanded")).toBe("true");
    expect(options().length).toBeGreaterThan(0);
  });

  it("announces the result count", () => {
    mount();
    type("mitsukiyo");

    const live = container.querySelector('[role="status"]');
    expect(live?.textContent).toMatch(/\d+ results? available/);
  });

  it("tracks the highlighted option with aria-activedescendant", () => {
    mount();
    type("mitsukiyo");
    expect(input().getAttribute("aria-activedescendant")).toBeNull();

    press("ArrowDown");
    expect(activeOptionText()).toBe(options()[0].textContent);
    expect(options()[0].getAttribute("aria-selected")).toBe("true");

    press("ArrowDown");
    expect(activeOptionText()).toBe(options()[1].textContent);
    expect(options()[0].getAttribute("aria-selected")).toBe("false");
  });

  it("keeps focus on the input while arrowing", () => {
    const ref = mount();
    act(() => ref.current?.focus());
    type("mitsukiyo");

    press("ArrowDown");

    expect(document.activeElement).toBe(input());
  });
});

describe("Search keyboard navigation", () => {
  it("wraps from the last option back to the first", () => {
    mount();
    type("mitsukiyo");

    // End lands on the last option; one more ArrowDown must wrap around.
    press("End");
    expect(activeOptionText()).toBe(
      options()[options().length - 1].textContent
    );

    press("ArrowDown");
    expect(activeOptionText()).toBe(options()[0].textContent);
  });

  it("wraps backwards from the input to the last option", () => {
    mount();
    type("mitsukiyo");

    press("ArrowUp");
    expect(activeOptionText()).toBe(
      options()[options().length - 1].textContent
    );
  });

  it("jumps to the first and last option with Home and End", () => {
    mount();
    type("mitsukiyo");

    press("End");
    expect(activeOptionText()).toBe(
      options()[options().length - 1].textContent
    );

    press("Home");
    expect(activeOptionText()).toBe(options()[0].textContent);
  });

  it("selects the highlighted option on Enter and closes the list", () => {
    mount();
    type("mitsukiyo");
    press("ArrowDown");
    press("Enter");

    expect(setSelectedSong).toHaveBeenCalled();
    expect(options()).toHaveLength(0);
    expect(input().getAttribute("aria-expanded")).toBe("false");
  });

  it("ignores Enter when nothing is highlighted", () => {
    mount();
    type("mitsukiyo");

    press("Enter");

    expect(setSelectedSong).not.toHaveBeenCalledWith(
      expect.objectContaining({ themeNo: expect.anything() })
    );
    expect(options().length).toBeGreaterThan(0);
  });

  it("clears the box on Escape", () => {
    mount();
    type("mitsukiyo");

    press("Escape");

    expect(input().value).toBe("");
    expect(options()).toHaveLength(0);
  });
});

describe("Search behaviour", () => {
  it("selects a song when an option is clicked", () => {
    mount();
    type("constant moderato");

    act(() => {
      options()[0].dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(setSelectedSong).toHaveBeenCalledWith(
      songs.find((s) => s.name === "Constant Moderato")
    );
  });

  it("shows nothing for a blank term", () => {
    mount();
    type("   ");

    expect(options()).toHaveLength(0);
  });

  it("clears itself when the try advances", () => {
    mount(0);
    type("mitsukiyo");
    expect(options().length).toBeGreaterThan(0);

    mount(1);

    expect(input().value).toBe("");
    expect(options()).toHaveLength(0);
  });

  it("exposes an accessible clear button only when there is text", () => {
    mount();
    expect(
      container.querySelector('button[aria-label="Clear search"]')
    ).toBeNull();

    type("mitsukiyo");
    const clear = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Clear search"]'
    );
    expect(clear).not.toBeNull();

    act(() => {
      clear!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(input().value).toBe("");
  });
});
