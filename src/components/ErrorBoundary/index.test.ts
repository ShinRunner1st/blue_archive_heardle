import React, { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createHarness } from "../../test/harness";

import { ErrorBoundary } from "./index";
import { STORAGE_KEY } from "../../constants/game";

let harness: ReturnType<typeof createHarness>;
let container: HTMLDivElement;

function Boom(): React.ReactElement {
  throw new Error("kaboom");
}

function mount(child: React.ReactNode) {
  harness.render(React.createElement(ErrorBoundary, null, child));
}

/**
 * React 17's dev build re-dispatches a caught error so devtools can see it,
 * which jsdom then reports as uncaught. Swallow it so a deliberate throw does
 * not dump a stack trace into CI logs.
 */
function swallowUncaught(e: ErrorEvent) {
  e.preventDefault();
}

beforeEach(() => {
  harness = createHarness();
  container = harness.container;
  window.addEventListener("error", swallowUncaught);
  // React logs the caught error itself; keep the test output readable.
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  harness.destroy();
  window.removeEventListener("error", swallowUncaught);
  localStorage.clear();
});

describe("ErrorBoundary", () => {
  it("renders its children when nothing throws", () => {
    mount(React.createElement("p", null, "all good"));

    expect(container.textContent).toContain("all good");
  });

  it("shows a recovery screen instead of a blank page", () => {
    mount(React.createElement(Boom));

    expect(container.textContent).toContain("Something broke");
    expect(container.textContent).toContain("kaboom");
    expect(container.querySelectorAll("button")).toHaveLength(2);
  });

  it("clears the save when asked to", () => {
    localStorage.setItem(STORAGE_KEY, "[]");
    const reload = vi.fn();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { reload },
    });

    mount(React.createElement(Boom));

    const reset = Array.from(container.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("Clear save")
    );
    act(() => {
      reset?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(reload).toHaveBeenCalled();
  });
});
