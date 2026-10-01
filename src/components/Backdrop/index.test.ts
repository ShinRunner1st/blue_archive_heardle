import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { theme } from "../../constants";
import { pictureFiles } from "../../constants/pictureFiles";
import { STREAK_PLACES } from "../../constants/streakPlaces";
import { createHarness, Harness } from "../../test/harness";
import { Backdrop, ROOMS_SCENE } from ".";

let harness: Harness;

beforeEach(() => {
  harness = createHarness();
});

afterEach(() => {
  harness.destroy();
  vi.useRealTimers();
});

/** The picture the backdrop's top layer shows, from its generated CSS. */
function shownPicture(): string {
  const layers = harness.container.querySelectorAll("[aria-hidden]");
  const top = layers[layers.length - 1];
  const css = [...document.querySelectorAll("style")]
    .map((style) => style.textContent)
    .join("\n");
  for (const name of top.className.split(" ")) {
    const rule = css.match(
      new RegExp(`\\.${name}\\{[^}]*background-image:url\\(([^)]+)\\)`)
    );
    if (rule) return rule[1];
  }
  return "";
}

function renderOn(
  date: Date,
  place: (typeof STREAK_PLACES)[number] | null,
  scene?: typeof ROOMS_SCENE
) {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(date);
  harness.render(React.createElement(Backdrop, { place, scene }));
}

describe("Backdrop", () => {
  it("dresses the home picture up for Christmas", () => {
    renderOn(new Date(2026, 11, 25, 12), null);
    expect(shownPicture()).toContain(pictureFiles["seasons/christmas-day"]);
  });

  it("keeps a streak place in season: it was earned", () => {
    renderOn(new Date(2026, 11, 25, 12), STREAK_PLACES[0]);
    expect(shownPicture()).toBe(STREAK_PLACES[0].day);
  });

  it("shows the library out of season", () => {
    renderOn(new Date(2026, 8, 28, 12), null);
    expect(shownPicture()).toBe(theme.backgroundImage);
  });

  it("shows a page's own scene over a streak place and the season", () => {
    renderOn(new Date(2026, 11, 25, 12), STREAK_PLACES[0], ROOMS_SCENE);
    expect(shownPicture()).toContain(pictureFiles[ROOMS_SCENE.day]);
  });
});
