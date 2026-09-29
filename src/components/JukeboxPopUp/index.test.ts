import React, { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createHarness } from "../../test/harness";

import { loadAudio } from "../../helpers/audioSource";
import { getSongUrl } from "../../helpers/audioUrl";
import { Jukebox, JukeboxPopUp } from "./index";

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
    document.querySelector("audio")!.dispatchEvent(new Event("loadedmetadata"));
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
  vi.spyOn(window.HTMLMediaElement.prototype, "load").mockImplementation(
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

    // Whole songs go in the song store.
    expect(loadAudio).toHaveBeenCalledWith(getSongUrl("1"), { keep: true });
    expect(player().textContent).toContain("Constant Moderato");
    expect(play).toHaveBeenCalled();
  });

  it("keeps one player for every song, so its layout never changes", async () => {
    mount();
    click(songButton("Constant Moderato"));
    await songLoads();
    const audio = document.querySelector("audio");

    click(songButton("Mischievous Step"));

    expect(document.querySelector("audio")).toBe(audio);
    expect(player().textContent).toContain("Mischievous Step");
  });

  it("marks songs guessed right apart from the rest", () => {
    mount(["1"]);

    expect(songButton("Constant Moderato")!.dataset.dim).toBe("false");
    expect(songButton("Constant Moderato")!.dataset.strong).toBe("true");
    expect(songButton("Mischievous Step")!.dataset.dim).toBe("true");
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

  it("stops at the end of a song, plays the next, or repeats it", async () => {
    mount();
    const repeat = () =>
      player().querySelector<HTMLButtonElement>('[aria-label^="Repeat"]')!;
    const audio = () => document.querySelector("audio")!;
    const end = () =>
      act(() => {
        audio().dispatchEvent(new Event("ended"));
      });
    expect(repeat().getAttribute("aria-label")).toBe("Repeat: off");

    click(songButton("Constant Moderato"));
    await songLoads();
    end();
    expect(player().textContent).toContain("Constant Moderato");

    click(repeat());
    expect(repeat().getAttribute("aria-label")).toBe(
      "Repeat: play the next song"
    );
    expect(localStorage.getItem("jukeboxRepeat")).toBe("next");
    end();
    expect(player().textContent).toContain("Luminous memory");

    click(repeat());
    expect(repeat().getAttribute("aria-label")).toBe("Repeat: this song");
    expect(audio().loop).toBe(true);

    click(repeat());
    expect(repeat().getAttribute("aria-label")).toBe("Repeat: off");
    expect(audio().loop).toBe(false);
    expect(localStorage.getItem("jukeboxRepeat")).toBeNull();
  });

  it("folds its album chips like All OST's artists", () => {
    mount();

    expect(document.querySelector("#jukebox-albums")).not.toBeNull();
    expect(
      document.querySelector('[aria-label="Filter by album"]')?.children
    ).toHaveLength(10);
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

describe("Jukebox, closed", () => {
  const onOpen = vi.fn();

  function mountJukebox(open: boolean) {
    harness.render(
      React.createElement(Jukebox, {
        open,
        onOpen,
        onClose,
        guessed: new Set<string>(),
      })
    );
  }

  async function playOne() {
    mountJukebox(true);
    click(songButton("Constant Moderato"));
    await songLoads();
    return document.querySelector("audio");
  }

  const mini = () => document.querySelector('[aria-label="Jukebox"]');
  const miniButton = (label: string) =>
    mini()?.querySelector<HTMLButtonElement>(`[aria-label="${label}"]`);

  it("plays on in the corner, on the same audio", async () => {
    const audio = await playOne();
    mountJukebox(false);

    expect(mini()?.textContent).toContain("Constant Moderato");
    // The same element: closing the pop-up didn't cut the music.
    expect(document.querySelector("audio")).toBe(audio);

    click(miniButton("Open the Jukebox"));
    expect(onOpen).toHaveBeenCalled();
  });

  it("stops from the corner", async () => {
    await playOne();
    mountJukebox(false);
    const pause = vi.mocked(window.HTMLMediaElement.prototype.pause);
    pause.mockClear();

    click(miniButton("Stop the music"));
    expect(mini()).toBeNull();
    // Paused, not only emptied: a playing song keeps on otherwise.
    expect(pause).toHaveBeenCalled();
    expect(document.querySelector("audio")?.getAttribute("src")).toBeNull();
  });

  it("stops once a game's own audio plays, and not for its own", async () => {
    const own = (await playOne())!;
    mountJukebox(false);

    act(() => {
      own.dispatchEvent(new Event("play"));
    });
    expect(mini()).not.toBeNull();

    const clip = document.createElement("audio");
    document.body.appendChild(clip);
    const pause = vi.mocked(window.HTMLMediaElement.prototype.pause);
    pause.mockClear();
    act(() => {
      clip.dispatchEvent(new Event("play"));
    });

    expect(mini()).toBeNull();
    expect(pause).toHaveBeenCalled();
    clip.remove();
  });
});
