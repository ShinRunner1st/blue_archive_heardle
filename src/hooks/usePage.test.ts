import React, { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Page } from "../constants/pages";
import { createHarness } from "../test/harness";
import { guardHistory, unguardHistory, usePage } from "./usePage";

let harness: ReturnType<typeof createHarness>;
let page: Page;
let navigate: (page: Page) => void;
const lock: { current: (() => void) | null } = { current: null };

function Probe() {
  [page, navigate] = usePage(lock);
  return null;
}

/** Back, as the browser does it: the address changes, then popstate. */
function back(to: string) {
  window.history.replaceState(null, "", to);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

beforeEach(() => {
  lock.current = null;
  window.history.replaceState(null, "", "/multiplayer?room=ABCD");
  harness = createHarness();
  harness.render(React.createElement(Probe));
});

afterEach(() => {
  harness.destroy();
  window.history.replaceState(null, "", "/");
});

describe("usePage", () => {
  it("stays on the page while locked, and says so", () => {
    const stay = vi.fn();
    lock.current = stay;
    act(() => navigate("ost"));
    expect(page).toBe("multiplayer");
    expect(window.location.pathname).toBe("/multiplayer");

    guardHistory();
    act(() => back("/"));
    expect(page).toBe("multiplayer");
    expect(window.location.pathname + window.location.search).toBe(
      "/multiplayer?room=ABCD"
    );
    expect(stay).toHaveBeenCalledTimes(2);
  });

  it("moves again once unlocked", () => {
    lock.current = vi.fn();
    guardHistory();
    lock.current = null;
    unguardHistory();
    act(() => navigate("ost"));
    expect(page).toBe("ost");
    expect(window.location.pathname).toBe("/ost");
  });
});
