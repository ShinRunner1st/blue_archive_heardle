import React, { act } from "react";
import { afterEach, beforeEach, describe, expect, it, Mock, vi } from "vitest";

import { createHarness } from "../../test/harness";

import { NowPlaying } from "./index";
import { clearUnplayable, isUnplayable } from "../../helpers/unplayable";

const song = { artist: "Mitsukiyo", name: "Constant Moderato", themeNo: "1" };

/** jsdom has no media engine, so stand in for the parts this uses. */
const media = { now: 0, duration: 137, paused: true };

let harness: ReturnType<typeof createHarness>;
let play: Mock<() => Promise<void>>;
let pause: Mock<() => void>;
let seeks: number[];

function mount(startTime = 42, clipLength = 7) {
  harness.render(
    React.createElement(NowPlaying, { song, startTime, clipLength })
  );
}

function audio() {
  return harness.container.querySelector("audio");
}

function fire(type: string) {
  act(() => {
    audio()!.dispatchEvent(new Event(type));
  });
}

/** Moves playback to a time and lets the element report it. */
function playTo(seconds: number) {
  media.now = seconds;
  fire("timeupdate");
}

function button(label: string) {
  return Array.from(harness.container.querySelectorAll("button")).find(
    (b) =>
      b.getAttribute("aria-label") === label || b.textContent?.includes(label)
  );
}

function click(label: string) {
  act(() => {
    button(label)!.click();
  });
}

beforeEach(() => {
  const proto = window.HTMLMediaElement.prototype;
  media.now = 0;
  media.duration = 137;
  media.paused = true;
  seeks = [];

  play = vi.fn(() => {
    media.paused = false;
    return Promise.resolve();
  });
  pause = vi.fn(() => {
    media.paused = true;
  });

  vi.spyOn(proto, "play").mockImplementation(play);
  vi.spyOn(proto, "pause").mockImplementation(pause);
  vi.spyOn(proto, "load").mockImplementation(() => undefined);
  vi.spyOn(proto, "paused", "get").mockImplementation(() => media.paused);
  vi.spyOn(proto, "duration", "get").mockImplementation(() => media.duration);
  vi.spyOn(proto, "currentTime", "get").mockImplementation(() => media.now);
  vi.spyOn(proto, "currentTime", "set").mockImplementation((seconds) => {
    media.now = seconds;
    seeks.push(seconds);
  });

  clearUnplayable();
  harness = createHarness();
});

afterEach(() => {
  harness.destroy();
});

describe("NowPlaying", () => {
  it("names the song without repeating its theme number", () => {
    mount();

    expect(harness.container.textContent).toContain("Constant Moderato");
    expect(harness.container.textContent).toContain("Mitsukiyo");
    expect(harness.container.textContent).not.toMatch(/Theme\s*0?1\b/);
  });

  it("loads the answer's own file, with its own controls", () => {
    mount();

    expect(audio()?.getAttribute("src")).toBe("/audio/Theme_01.ogg");
    expect(audio()?.getAttribute("preload")).toBe("metadata");
    expect(audio()?.hasAttribute("controls")).toBe(false);
  });

  it("waits for the file before enabling the controls", () => {
    mount();

    expect(button("Play")?.disabled).toBe(true);
    expect(button("Replay my clip")?.disabled).toBe(true);
    expect(harness.container.textContent).toContain("-:--");
  });

  it("starts where the round's clip started, at the game's volume", () => {
    mount(42);
    fire("loadedmetadata");

    expect(seeks).toEqual([42]);
    expect(audio()?.volume).toBe(0.2);
    expect(play).toHaveBeenCalled();
    expect(harness.container.textContent).toContain("0:42");
    expect(harness.container.textContent).toContain("2:17");
  });

  it("shows which part of the song was the clip", () => {
    mount(42, 7);
    fire("loadedmetadata");

    expect(harness.container.textContent).toContain("Your clip: 0:42 – 0:49");

    const band = harness.container.querySelector<HTMLElement>(
      '[data-testid="clip-band"]'
    )!;
    expect(parseFloat(band.style.left)).toBeCloseTo((42 / 137) * 100);
    expect(parseFloat(band.style.width)).toBeCloseTo((7 / 137) * 100);
  });

  it("keeps the clip marker inside a short song", () => {
    media.duration = 45;
    mount(40, 16);
    fire("loadedmetadata");

    expect(harness.container.textContent).toContain("Your clip: 0:40 – 0:45");
  });

  it("replays just the clip, then stops", () => {
    mount(42, 7);
    fire("loadedmetadata");
    playTo(90);
    pause.mockClear();

    click("Replay my clip");

    expect(seeks[seeks.length - 1]).toBe(42);
    expect(play).toHaveBeenCalled();

    playTo(45);
    expect(pause).not.toHaveBeenCalled();

    playTo(49.1);
    expect(pause).toHaveBeenCalled();
  });

  it("plays on freely after the play button, even past the clip", () => {
    mount(42, 7);
    fire("loadedmetadata");
    click("Replay my clip");
    fire("play");

    // Pause mid-clip, then carry on with the main button.
    click("Pause");
    fire("pause");
    click("Play");
    fire("play");
    pause.mockClear();
    playTo(60);

    expect(pause).not.toHaveBeenCalled();
  });

  it("follows the element's own play and pause", () => {
    mount();
    fire("loadedmetadata");

    fire("play");
    expect(button("Pause")).toBeDefined();

    fire("pause");
    expect(button("Play")).toBeDefined();
  });

  it("seeks when the timeline is moved", () => {
    mount();
    fire("loadedmetadata");

    const seek = harness.container.querySelector<HTMLInputElement>(
      'input[type="range"]'
    )!;
    act(() => {
      Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value"
      )!.set!.call(seek, "100");
      seek.dispatchEvent(new Event("input", { bubbles: true }));
    });

    expect(seeks[seeks.length - 1]).toBe(100);
    expect(harness.container.textContent).toContain("1:40");
  });

  it("stays usable when the browser blocks autoplay", async () => {
    play.mockImplementationOnce(() =>
      Promise.reject(new DOMException("blocked", "NotAllowedError"))
    );
    mount();
    fire("loadedmetadata");
    await act(async () => undefined);

    expect(button("Play")?.disabled).toBe(false);
  });
});

describe("NowPlaying when the file will not play", () => {
  it("still names the song, and says why there is no player", () => {
    mount();
    fire("error");

    expect(audio()).toBeNull();
    expect(harness.container.textContent).toContain("Constant Moderato");
    expect(harness.container.textContent).toContain("won’t play here");
  });

  it("remembers the song so the rest of the session skips it", () => {
    mount();
    fire("error");

    expect(isUnplayable("1")).toBe(true);
  });
});
