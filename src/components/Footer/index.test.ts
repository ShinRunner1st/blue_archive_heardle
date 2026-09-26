import React from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { Footer } from "./index";
import { createHarness } from "../../test/harness";

let harness: ReturnType<typeof createHarness>;

function link() {
  return harness.container.querySelector("a")!;
}

beforeEach(() => {
  harness = createHarness();
  harness.render(React.createElement(Footer));
});

afterEach(() => {
  harness.destroy();
});

describe("Footer", () => {
  it("links to the project repository", () => {
    expect(link().getAttribute("href")).toBe(
      "https://github.com/ShinRunner1st/blue_archive_heardle"
    );
  });

  it("opens in a new tab without leaking the opener", () => {
    expect(link().getAttribute("target")).toBe("_blank");
    expect(link().getAttribute("rel")).toContain("noopener");
  });

  // The link used to carry tabIndex={-1}, which made it unreachable by
  // keyboard.
  it("is reachable by keyboard", () => {
    expect(link().getAttribute("tabindex")).toBeNull();
  });

  // A negative z-index put the footer behind the main container, which then
  // swallowed every click on the link.
  it("is not painted behind the rest of the page", () => {
    const footer = harness.container.firstElementChild as HTMLElement;
    const zIndex = getComputedStyle(footer).zIndex;

    expect(Number(zIndex) < 0).toBe(false);
  });

  it("stays in normal flow so nothing overlaps it", () => {
    const footer = harness.container.firstElementChild as HTMLElement;

    expect(getComputedStyle(footer).position).not.toBe("absolute");
  });
});
