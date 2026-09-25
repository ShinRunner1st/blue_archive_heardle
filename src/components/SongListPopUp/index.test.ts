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

function chip(artist: string) {
  return Array.from(
    document.querySelectorAll<HTMLButtonElement>(
      '[aria-label="Filter by artist"] button'
    )
  ).find((button) => button.firstChild?.textContent === artist);
}

function pickChip(artist: string) {
  act(() => chip(artist)!.click());
}

/** The artist tag at the end of each row, in list order. */
function rowArtists() {
  return songButtons().map((button) => button.lastElementChild?.textContent);
}

beforeEach(() => {
  harness = createHarness();
});

afterEach(() => {
  harness.destroy();
  vi.clearAllMocks();
});

describe("SongListPopUp", () => {
  it("lists every song in theme order, each tagged with its artist", () => {
    mount();

    expect(songButtons()).toHaveLength(songs.length);
    expect(document.body.textContent).toContain(`${songs.length} songs`);
    expect(songButtons()[0].textContent).toContain(songs[0].name);
    expect(rowArtists()[0]).toBe(songs[0].artist);
    // One flat list: no artist headings any more.
    expect(document.querySelectorAll("h3")).toHaveLength(0);
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
    expect(rowArtists()).toEqual(["Mitsukiyo"]);
    expect(document.body.textContent).toContain("1 song");
  });

  it("filters by theme number too", () => {
    mount();

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

describe("SongListPopUp artist filter", () => {
  const norCount = songs.filter((song) => song.artist === "Nor").length;

  it("offers All, then every artist with their song count, biggest first", () => {
    mount();

    const labels = Array.from(
      document.querySelectorAll('[aria-label="Filter by artist"] button')
    ).map((button) => button.textContent);

    expect(labels[0]).toBe("All");
    expect(labels[1]).toMatch(/^KARUT\d+$/);
    expect(labels.at(-1)).toMatch(/^Unknown\d+$/);
    expect(chip("All")?.getAttribute("aria-pressed")).toBe("true");
  });

  it("shows only the picked artist's songs", () => {
    mount();

    pickChip("Nor");

    expect(songButtons()).toHaveLength(norCount);
    expect(new Set(rowArtists())).toEqual(new Set(["Nor"]));
    expect(chip("Nor")?.getAttribute("aria-pressed")).toBe("true");
    expect(chip("All")?.getAttribute("aria-pressed")).toBe("false");
  });

  it("goes back to everyone when the picked artist is tapped again", () => {
    mount();
    pickChip("Nor");

    pickChip("Nor");

    expect(songButtons()).toHaveLength(songs.length);
    expect(chip("All")?.getAttribute("aria-pressed")).toBe("true");
  });

  it("goes back to everyone from All", () => {
    mount();
    pickChip("Nor");

    pickChip("All");

    expect(songButtons()).toHaveLength(songs.length);
  });

  it("works together with the text filter", () => {
    mount();
    pickChip("Mitsukiyo");

    filter("constant");
    expect(songButtons().length).toBeGreaterThan(0);
    expect(new Set(rowArtists())).toEqual(new Set(["Mitsukiyo"]));

    pickChip("KARUT");
    expect(songButtons()).toHaveLength(0);
    expect(document.body.textContent).toContain(
      "No songs match “constant” by KARUT."
    );
  });
});
