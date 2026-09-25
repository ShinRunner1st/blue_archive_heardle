import React, { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createHarness } from "../../test/harness";

import { songs } from "../../constants";
import { SongListPopUp } from "./index";

let harness: ReturnType<typeof createHarness>;
const onClose = vi.fn();
const onSelect = vi.fn();

function mount(
  extra: Partial<React.ComponentProps<typeof SongListPopUp>> = {}
) {
  harness.render(
    React.createElement(SongListPopUp, {
      onClose,
      onSelect,
      guessed: [],
      ...extra,
    })
  );
}

function filterInput() {
  return document.querySelector<HTMLInputElement>(
    'input[aria-label="Filter songs"]'
  )!;
}

function filter(text: string) {
  act(() => {
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value"
    )!.set!.call(filterInput(), text);
    filterInput().dispatchEvent(new Event("input", { bubbles: true }));
  });
}

function pressEnter() {
  act(() => {
    filterInput().dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true })
    );
  });
}

function songButtons() {
  return Array.from(
    document.querySelectorAll<HTMLButtonElement>("li > button")
  );
}

function songButton(name: string) {
  return songButtons().find((button) => button.textContent?.includes(name));
}

function artistHeadings() {
  return Array.from(document.querySelectorAll("h3")).map(
    (heading) => heading.firstChild?.textContent
  );
}

beforeEach(() => {
  harness = createHarness();
});

afterEach(() => {
  harness.destroy();
  vi.clearAllMocks();
});

describe("SongListPopUp", () => {
  it("lists every song, grouped by artist", () => {
    mount();

    expect(songButtons()).toHaveLength(songs.length);
    expect(document.body.textContent).toContain(`${songs.length} songs`);
    expect(artistHeadings()[0]).toBe("KARUT");
    expect(artistHeadings().at(-1)).toBe("Unknown");
  });

  it("picks a song as the guess when tapped", () => {
    mount();

    act(() => songButton("Constant Moderato")!.click());

    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ themeNo: "1", name: "Constant Moderato" })
    );
  });

  it("narrows the list as a filter is typed", () => {
    mount();

    filter("moderato piano");

    expect(songButtons()).toHaveLength(1);
    expect(artistHeadings()).toEqual(["Mitsukiyo"]);
    expect(document.body.textContent).toContain("1 song");
  });

  it("filters by artist and by theme number too", () => {
    mount();

    filter("nor");
    expect(artistHeadings()).toContain("Nor");

    filter("374");
    expect(songButtons().length).toBeGreaterThan(0);
  });

  it("picks the only match on Enter", () => {
    mount();
    filter("moderato piano");

    pressEnter();

    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ themeNo: "87" })
    );
  });

  it("does not guess on Enter while several songs still match", () => {
    mount();
    filter("mitsukiyo");

    pressEnter();

    expect(onSelect).not.toHaveBeenCalled();
  });

  it("says so when nothing matches", () => {
    mount();

    filter("zzzz");

    expect(songButtons()).toHaveLength(0);
    expect(document.body.textContent).toContain("No songs match “zzzz”.");
  });

  it("marks the current pick and this round's wrong guesses", () => {
    mount({ selectedSong: songs[0], guessed: [songs[1].themeNo] });

    expect(songButton(songs[0].name)?.getAttribute("aria-pressed")).toBe(
      "true"
    );
    expect(songButton(songs[1].name)?.textContent).toContain("Guessed");
    expect(songButton(songs[2].name)?.textContent).not.toContain("Guessed");
  });

  it("closes on Escape", () => {
    mount();

    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });

    expect(onClose).toHaveBeenCalled();
  });
});
