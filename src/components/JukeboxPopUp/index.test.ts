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

function click(button: HTMLButtonElement | undefined) {
  act(() => {
    button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}

function chip(label: string) {
  return Array.from(
    document.querySelectorAll<HTMLButtonElement>('[aria-label="Album"] button')
  ).find((button) => button.textContent === label);
}

beforeEach(() => {
  harness = createHarness();
});

afterEach(() => {
  harness.destroy();
  vi.clearAllMocks();
});

describe("JukeboxPopUp", () => {
  it("downloads nothing until a song is picked", () => {
    mount();

    expect(document.body.textContent).toContain("Pick a song to play it.");
    expect(loadAudio).not.toHaveBeenCalled();
  });

  it("plays the whole song that is picked", () => {
    mount();

    click(songButton("Constant Moderato"));

    expect(loadAudio).toHaveBeenCalledWith(getSongUrl("1"));
    expect(document.querySelector("section h2")?.textContent).toBe(
      "Constant Moderato"
    );
    // A song on its own, with no clip of a round to mark.
    expect(document.body.textContent).not.toContain("Replay my clip");
  });

  it("marks songs guessed right apart from the rest", () => {
    mount(["1"]);

    const bright = getComputedStyle(songButton("Constant Moderato")!).opacity;
    const dim = getComputedStyle(songButton("Mischievous Step")!).opacity;
    expect(bright).toBe("1");
    expect(dim).toBe("0.5");
  });

  it("counts the songs guessed", () => {
    mount(["1", "3"]);

    expect(document.body.textContent).toContain("the 2 of");
  });

  it("shows one album when its chip is picked", () => {
    mount();

    click(chip("Vol.2"));

    expect(songButton("Luminous memory")).toBeDefined();
    expect(songButton("Constant Moderato")).toBeUndefined();
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
