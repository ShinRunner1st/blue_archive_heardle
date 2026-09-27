import React, { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createHarness } from "../../test/harness";

import { loadAudio } from "../../helpers/audioSource";
import { getSongUrl } from "../../helpers/audioUrl";
import { JukeboxPopUp } from "./index";

vi.mock("../../helpers/audioSource", () => ({
  loadAudio: vi.fn((url: string) => Promise.resolve(`blob:${url}`)),
}));

let harness: ReturnType<typeof createHarness>;
const onClose = vi.fn();
let play: ReturnType<typeof vi.fn>;

function mount(guessed: string[] = []) {
  harness.render(
    React.createElement(JukeboxPopUp, { onClose, guessed: new Set(guessed) })
  );
}

function songButton(name: string) {
  return Array.from(
    document.querySelectorAll<HTMLButtonElement>("li > button")
  ).find((button) => button.textContent?.includes(name));
}

function click(button: HTMLButtonElement | null | undefined) {
  act(() => {
    button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}

function chip(label: string) {
  return Array.from(
    document.querySelectorAll<HTMLButtonElement>(
      '[aria-label="Filter by album"] button'
    )
  ).find((button) => button.textContent?.startsWith(label));
}

function search(text: string) {
  const input = document.querySelector<HTMLInputElement>(
    'input[aria-label="Search songs"]'
  )!;
  act(() => {
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value"
    )!.set!.call(input, text);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

function player() {
  return document.querySelector('[aria-label="Jukebox player"]')!;
}

/** The picked song's file arrives and its metadata loads. */
async function songLoads() {
  await act(async () => undefined);
  act(() => {
    player().querySelector("audio")!.dispatchEvent(new Event("loadedmetadata"));
  });
}

beforeEach(() => {
  localStorage.clear();
  play = vi.fn(() => Promise.resolve());
  vi.spyOn(window.HTMLMediaElement.prototype, "play").mockImplementation(
    play as () => Promise<void>
  );
  vi.spyOn(window.HTMLMediaElement.prototype, "pause").mockImplementation(
    () => undefined
  );
  harness = createHarness();
});

afterEach(() => {
  harness.destroy();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe("JukeboxPopUp", () => {
  it("downloads nothing until a song is picked", () => {
    mount();

    expect(player().textContent).toContain("Pick a song to play it");
    expect(loadAudio).not.toHaveBeenCalled();
  });

  it("plays the whole song that is picked, as soon as it loads", async () => {
    mount();

    click(songButton("Constant Moderato"));
    await songLoads();

    expect(loadAudio).toHaveBeenCalledWith(getSongUrl("1"));
    expect(player().textContent).toContain("Constant Moderato");
    expect(play).toHaveBeenCalled();
  });

  it("keeps one player for every song, so its layout never changes", async () => {
    mount();
    click(songButton("Constant Moderato"));
    await songLoads();
    const audio = player().querySelector("audio");

    click(songButton("Mischievous Step"));

    expect(player().querySelector("audio")).toBe(audio);
    expect(player().textContent).toContain("Mischievous Step");
  });

  it("marks songs guessed right apart from the rest", () => {
    mount(["1"]);

    expect(getComputedStyle(songButton("Constant Moderato")!).opacity).toBe(
      "1"
    );
    expect(getComputedStyle(songButton("Mischievous Step")!).opacity).toBe(
      "0.5"
    );
  });

  it("lists the songs in one list, filtered by the albums picked", () => {
    mount();
    expect(songButton("Luminous memory")).toBeDefined();

    click(chip("Vol.2"));

    expect(songButton("Luminous memory")).toBeDefined();
    expect(songButton("Constant Moderato")).toBeUndefined();

    click(chip("Vol.1"));

    expect(songButton("Constant Moderato")).toBeDefined();
  });

  it("searches by name", () => {
    mount();

    search("mischievous");

    expect(document.querySelectorAll("li > button")).toHaveLength(1);
    expect(songButton("Mischievous Step")).toBeDefined();
  });

  it("goes to the next song in the list", async () => {
    mount();
    click(songButton("Constant Moderato"));
    await songLoads();

    click(
      player().querySelector<HTMLButtonElement>('[aria-label="Next song"]')
    );

    expect(player().textContent).toContain("Luminous memory");
  });

  it("stops at the end of a song unless auto next is on", async () => {
    mount();
    const autoNext = () =>
      player().querySelector<HTMLButtonElement>('[role="switch"]')!;
    expect(autoNext().getAttribute("aria-checked")).toBe("false");

    click(songButton("Constant Moderato"));
    await songLoads();
    act(() => {
      player().querySelector("audio")!.dispatchEvent(new Event("ended"));
    });
    expect(player().textContent).toContain("Constant Moderato");

    click(autoNext());
    expect(localStorage.getItem("jukeboxAutoNext")).toBe("true");
    act(() => {
      player().querySelector("audio")!.dispatchEvent(new Event("ended"));
    });
    expect(player().textContent).toContain("Luminous memory");
  });

  it("closes from its button", () => {
    mount();

    click(
      Array.from(document.querySelectorAll("button")).find(
        (button) => button.textContent === "Close"
      )
    );

    expect(onClose).toHaveBeenCalled();
  });
});
