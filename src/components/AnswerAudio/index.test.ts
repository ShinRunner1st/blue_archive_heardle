import React, { act } from "react";
import { afterEach, beforeEach, describe, expect, it, Mock, vi } from "vitest";

import { createHarness } from "../../test/harness";

import { AnswerAudio } from "./index";
import { clearUnplayable, isUnplayable } from "../../helpers/unplayable";

let harness: ReturnType<typeof createHarness>;
let play: Mock<() => Promise<void>>;
let seeks: number[];

function mount(startTime = 12) {
  harness.render(React.createElement(AnswerAudio, { themeNo: "1", startTime }));
}

function audio() {
  return harness.container.querySelector("audio");
}

function fire(type: string) {
  act(() => {
    audio()!.dispatchEvent(new Event(type));
  });
}

beforeEach(() => {
  // jsdom has no media engine, so stand in for the parts this uses.
  const proto = window.HTMLMediaElement.prototype;
  seeks = [];
  play = vi.fn(() => Promise.resolve());

  vi.spyOn(proto, "play").mockImplementation(play);
  vi.spyOn(proto, "load").mockImplementation(() => undefined);
  vi.spyOn(proto, "currentTime", "set").mockImplementation((seconds) => {
    seeks.push(seconds);
  });

  clearUnplayable();
  harness = createHarness();
});

afterEach(() => {
  harness.destroy();
});

describe("AnswerAudio", () => {
  it("loads the answer's own file, with controls", () => {
    mount();

    expect(audio()?.getAttribute("src")).toBe("/audio/Theme_01.ogg");
    expect(audio()?.hasAttribute("controls")).toBe(true);
    expect(audio()?.getAttribute("preload")).toBe("metadata");
  });

  it("starts where the round's clip started, at the game's volume", () => {
    mount(42);
    fire("loadedmetadata");

    expect(seeks).toEqual([42]);
    expect(audio()?.volume).toBe(0.2);
    expect(play).toHaveBeenCalled();
  });

  it("stays usable when the browser blocks autoplay", async () => {
    play.mockImplementationOnce(() =>
      Promise.reject(new DOMException("blocked", "NotAllowedError"))
    );
    mount();
    fire("loadedmetadata");
    await act(async () => undefined);

    expect(audio()).not.toBeNull();
  });
});

describe("AnswerAudio when the file will not play", () => {
  it("says so instead of showing controls that do nothing", () => {
    mount();
    fire("error");

    expect(audio()).toBeNull();
    expect(harness.container.textContent).toContain("won’t play here");
  });

  it("remembers the song so the rest of the session skips it", () => {
    mount();
    fire("error");

    expect(isUnplayable("1")).toBe(true);
  });
});
