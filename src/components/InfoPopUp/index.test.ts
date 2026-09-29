import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createHarness } from "../../test/harness";

import { InfoPopUp } from "./index";

let harness: ReturnType<typeof createHarness>;

function mount() {
  harness.render(
    React.createElement(InfoPopUp, {
      onClose: vi.fn(),
      mode: "daily",
    })
  );
}

function text() {
  return document.body.textContent ?? "";
}

beforeEach(() => {
  harness = createHarness();
  mount();
});

afterEach(() => {
  harness.destroy();
});

describe("InfoPopUp credit", () => {
  it("credits Blue Archive's developer and publishers", () => {
    expect(text()).toContain(
      "is developed by NEXON Games and published by NEXON and Yostar"
    );
  });

  it("links to the official site, in a new tab", () => {
    const link = Array.from(document.querySelectorAll("a")).find(
      (a) => a.textContent === "Blue Archive"
    );

    expect(link?.getAttribute("href")).toBe("https://bluearchive.nexon.com/");
    expect(link?.getAttribute("target")).toBe("_blank");
    expect(link?.getAttribute("rel")).toContain("noopener");
  });

  it("names the composers from the song list, leaving out Unknown", () => {
    expect(text()).toMatch(/Soundtrack by KARUT, Mitsukiyo, Nor, EmoCosine/);
    expect(text()).not.toMatch(/Soundtrack by[^.]*Unknown/);
  });

  it("says what is and isn't collected", () => {
    expect(text()).toContain("No accounts, cookies, ads or analytics");
    expect(text()).toContain("saved only in this browser");
    expect(text()).toContain("IP address");
  });

  it("offers a Ko-fi link, in a new tab", () => {
    const kofi = Array.from(document.querySelectorAll("a")).find(
      (a) => a.getAttribute("href") === "https://ko-fi.com/shinrunner1st"
    );

    expect(kofi?.textContent).toContain("Ko-fi");
    expect(kofi?.getAttribute("target")).toBe("_blank");
    expect(kofi?.getAttribute("rel")).toContain("noopener");
  });

  it("says it is an unofficial fan game", () => {
    expect(text()).toContain("unofficial fan game");
  });

  // Playback no longer comes from YouTube, so the old channel credit is gone.
  it("no longer points anywhere on YouTube", () => {
    const links = Array.from(document.querySelectorAll("a")).map(
      (a) => a.getAttribute("href") ?? ""
    );

    expect(links.some((href) => href.includes("youtube"))).toBe(false);
    expect(text()).not.toContain("MO2");
  });
});
