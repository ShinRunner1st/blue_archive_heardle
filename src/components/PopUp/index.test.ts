import React, { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createHarness } from "../../test/harness";

import { PopUp } from "./index";

let harness: ReturnType<typeof createHarness>;
let container: HTMLDivElement;
const onClose = vi.fn();

function mount(children: React.ReactNode = null) {
  harness.render(
    React.createElement(PopUp, { title: "Stats", onClose }, children)
  );
}

function unmount() {
  harness.unmount();
}

function press(key: string, init: KeyboardEventInit = {}) {
  act(() => {
    window.dispatchEvent(
      new KeyboardEvent("keydown", { key, bubbles: true, ...init })
    );
  });
}

function overlay() {
  return container.firstElementChild as HTMLElement;
}

function panel() {
  return container.querySelector<HTMLElement>('[role="dialog"]')!;
}

beforeEach(() => {
  harness = createHarness();
  container = harness.container;
});

afterEach(() => {
  unmount();
  container.remove();
  document.body.style.overflow = "";
  vi.clearAllMocks();
});

describe("PopUp", () => {
  it("exposes dialog semantics with the title as its accessible name", () => {
    mount();

    const dialog = panel();
    expect(dialog.getAttribute("aria-modal")).toBe("true");

    const labelledBy = dialog.getAttribute("aria-labelledby");
    expect(labelledBy).toBeTruthy();
    expect(document.getElementById(labelledBy!)?.textContent).toBe("Stats");
  });

  it("gives each dialog its own title id", () => {
    mount();
    const first = panel().getAttribute("aria-labelledby");
    unmount();
    mount();

    expect(panel().getAttribute("aria-labelledby")).not.toBe(first);
  });

  it("closes on Escape", () => {
    mount();

    press("Escape");

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes when the backdrop is clicked", () => {
    mount();

    act(() => {
      overlay().dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("stays open when the panel itself is clicked", () => {
    mount();

    act(() => {
      panel().dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    });

    expect(onClose).not.toHaveBeenCalled();
  });

  it("locks body scroll while open and restores it on close", () => {
    expect(document.body.style.overflow).toBe("");

    mount();
    expect(document.body.style.overflow).toBe("hidden");

    unmount();
    expect(document.body.style.overflow).toBe("");
  });

  it("moves focus into the dialog and restores it on close", () => {
    const opener = document.createElement("button");
    document.body.appendChild(opener);
    opener.focus();
    expect(document.activeElement).toBe(opener);

    mount(React.createElement("button", null, "Close"));
    expect(panel().contains(document.activeElement)).toBe(true);

    unmount();
    expect(document.activeElement).toBe(opener);

    opener.remove();
  });

  it("keeps Tab inside the dialog", () => {
    mount(
      React.createElement(
        React.Fragment,
        null,
        React.createElement("button", { key: "a" }, "First"),
        React.createElement("button", { key: "b" }, "Last")
      )
    );

    const [first, last] = Array.from(panel().querySelectorAll("button"));

    last.focus();
    press("Tab");
    expect(document.activeElement).toBe(first);

    first.focus();
    press("Tab", { shiftKey: true });
    expect(document.activeElement).toBe(last);
  });
});
