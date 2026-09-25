import React, { act } from "react";
import { afterEach, beforeEach, describe, expect, it, Mock, vi } from "vitest";

import { createHarness } from "../../test/harness";

import { playTimes } from "../../constants";
import { Player } from "./index";
import { clearUnplayable, isUnplayable } from "../../helpers/unplayable";
import { setVolume } from "../../helpers/volume";

const DURATION = 200;

/**
 * jsdom has <audio> but no media engine: play() and pause() are unimplemented
 * and time never moves. These stand in for the parts of HTMLMediaElement the
 * player uses, and tests move the clock by hand.
 */
const media = { now: 0, duration: DURATION };

let play: Mock<() => Promise<void>>;
let pause: Mock<() => void>;
let seeks: number[];
let readTime: Mock<() => number>;

function stubMedia() {
  const proto = window.HTMLMediaElement.prototype;
  seeks = [];

  play = vi.fn(() => Promise.resolve());
  pause = vi.fn(() => undefined);
  readTime = vi.fn(() => media.now);

  vi.spyOn(proto, "play").mockImplementation(play);
  vi.spyOn(proto, "pause").mockImplementation(pause);
  vi.spyOn(proto, "load").mockImplementation(() => undefined);
  vi.spyOn(proto, "duration", "get").mockImplementation(() => media.duration);
  vi.spyOn(proto, "currentTime", "get").mockImplementation(readTime);
  vi.spyOn(proto, "currentTime", "set").mockImplementation((seconds) => {
    media.now = seconds;
    seeks.push(seconds);
  });
}

let harness: ReturnType<typeof createHarness>;
let container: HTMLDivElement;
const setStartTime = vi.fn();
const skipTrack = vi.fn();

function audio() {
  return container.querySelector("audio")!;
}

function fire(type: string) {
  act(() => {
    audio().dispatchEvent(new Event(type));
  });
}

function mount(
  startTime: number | null = null,
  currentTry = 0,
  keyboardEnabled = true,
  // Daily mode passes no skip handler, since its puzzle cannot be swapped.
  canSkipTrack = true,
  loads = true
) {
  harness.render(
    React.createElement(Player, {
      themeNo: "1",
      currentTry,
      setStartTime,
      startTime,
      inputRef: React.createRef<HTMLInputElement>(),
      keyboardEnabled,
      onSkipTrack: canSkipTrack ? skipTrack : undefined,
    })
  );

  // A file that never arrives never fires loadedmetadata - that is the case
  // the timeout exists for.
  if (loads) fire("loadedmetadata");
}

function buttonWith(text: string) {
  return Array.from(container.querySelectorAll("button")).find((button) =>
    button.textContent?.includes(text)
  );
}

/** Moves playback forward and lets the 250ms poll observe it. */
function advancePlayback(seconds: number) {
  act(() => {
    media.now += seconds;
    vi.advanceTimersByTime(250);
  });
}

/** The progress fill is the first child of the progress track. */
function progressWidth() {
  const track = container.children[1];
  const fill = track?.firstElementChild;
  return fill ? getComputedStyle(fill).width : "";
}

function clickTransport() {
  act(() => {
    container
      .querySelector("svg")
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  media.now = 0;
  media.duration = DURATION;
  stubMedia();
  clearUnplayable();
  harness = createHarness();
  container = harness.container;
});

afterEach(() => {
  harness.destroy();
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("Player", () => {
  it("requests only the current song, and only its metadata up front", () => {
    mount();

    expect(container.querySelectorAll("audio")).toHaveLength(1);
    expect(audio().getAttribute("src")).toBe("/audio/Theme_01.ogg");
    expect(audio().getAttribute("preload")).toBe("metadata");
  });

  it("leaves the loading state once the metadata arrives", () => {
    mount();

    expect(container.textContent).not.toContain("Loading player");
  });

  it("rolls a non-zero start time and reports it upwards", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);

    mount(null);

    // (200 - 16) * 0.5 = 92
    expect(setStartTime).toHaveBeenCalledWith(92);
    expect(seeks).toContain(92);
  });

  it("does not re-roll a start time already stored for the round", () => {
    mount(42);

    expect(setStartTime).not.toHaveBeenCalled();
    expect(seeks).toContain(42);
  });

  it("plays a new player's clip at 20%", () => {
    mount(10);

    expect(audio().volume).toBe(0.2);
  });

  it("plays at the volume the player chose, and follows changes live", () => {
    localStorage.setItem("volume", "0.6");
    mount(10);
    expect(audio().volume).toBe(0.6);

    act(() => setVolume(0.35));
    expect(audio().volume).toBe(0.35);
  });

  it("gives a retried element the player's volume too", () => {
    act(() => setVolume(0.7));
    mount(10, 0, true, true, false);
    fire("error");

    act(() => {
      buttonWith("Try again")?.click();
    });

    expect(audio().volume).toBe(0.7);
  });

  it("offers the volume control beside the play button", () => {
    mount(10);

    expect(
      container.querySelector('input[type="range"][aria-label="Volume"]')
    ).not.toBeNull();
  });

  it("survives a file that reports no duration", () => {
    media.duration = NaN;

    expect(() => mount(null)).not.toThrow();
    expect(setStartTime).toHaveBeenCalledWith(0);
    expect(container.textContent).not.toContain("Loading player");
  });

  it("advances the progress bar while playing", () => {
    mount(10);
    expect(progressWidth()).toBe("0%");

    clickTransport();
    advancePlayback(0.5);

    // 0.5s of a 16s bar.
    expect(progressWidth()).toBe("3.125%");

    advancePlayback(0.25);
    expect(progressWidth()).toBe("4.6875%");
  });

  it("stops the clip once the current try's play time elapses", () => {
    mount(10, 0);

    clickTransport();
    expect(play).toHaveBeenCalled();

    // playTimes[0] is 1000ms, so 0.5s in it must still be running.
    advancePlayback(0.5);
    expect(pause).not.toHaveBeenCalled();

    advancePlayback(0.75);
    expect(pause).toHaveBeenCalled();
    expect(seeks[seeks.length - 1]).toBe(10);
  });

  it("gives a later try a longer clip", () => {
    mount(10, 3);

    clickTransport();

    // playTimes[3] is 7000ms, so 5s in the clip is still running.
    advancePlayback(5);
    expect(pause).not.toHaveBeenCalled();

    advancePlayback(2.5);
    expect(pause).toHaveBeenCalled();
  });

  it("polls only while playing", () => {
    mount(10);
    readTime.mockClear();

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(readTime).not.toHaveBeenCalled();

    clickTransport();
    act(() => {
      vi.advanceTimersByTime(250);
    });
    expect(readTime).toHaveBeenCalled();
  });

  // The browser's own media controls can start playback without the button.
  it("still caps a clip started from outside the page", () => {
    mount(10, 0);

    fire("play");
    advancePlayback(1.25);

    expect(pause).toHaveBeenCalled();
  });

  it("goes back to Play when the browser refuses to start playback", async () => {
    play.mockImplementationOnce(() =>
      Promise.reject(new DOMException("blocked", "NotAllowedError"))
    );
    mount(10);

    clickTransport();
    await act(async () => undefined);

    expect(
      container.querySelector('button[aria-label="Play clip"]')
    ).not.toBeNull();
  });

  it("resets to the clip start if the track runs out first", () => {
    mount(10);
    clickTransport();
    media.now = 25;

    fire("ended");

    expect(seeks[seeks.length - 1]).toBe(10);
    expect(
      container.querySelector('button[aria-label="Play clip"]')
    ).not.toBeNull();
  });

  it("keeps the song title out of the browser's media controls", () => {
    const session = { metadata: null as unknown };
    vi.stubGlobal(
      "MediaMetadata",
      class {
        constructor(init: object) {
          Object.assign(this, init);
        }
      }
    );
    Object.defineProperty(navigator, "mediaSession", {
      value: session,
      configurable: true,
    });

    try {
      mount(10);
      clickTransport();

      expect(session.metadata).toMatchObject({ title: "Guess the Song" });
    } finally {
      delete (navigator as { mediaSession?: unknown }).mediaSession;
      vi.unstubAllGlobals();
    }
  });

  it("responds to Space when the keyboard is live", () => {
    mount(10);

    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { code: "Space" }));
    });

    expect(play).toHaveBeenCalled();
  });

  it("ignores Space while a dialog is open", () => {
    mount(10, 0, false);

    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { code: "Space" }));
    });

    expect(play).not.toHaveBeenCalled();
  });

  it("keeps the longest clip within the track", () => {
    expect(playTimes[playTimes.length - 1] / 1000).toBe(16);

    vi.spyOn(Math, "random").mockReturnValue(0.999999);
    mount(null);

    const rolled = setStartTime.mock.calls[0][0] as number;
    expect(rolled + 16).toBeLessThanOrEqual(DURATION);
  });

  it("loads under StrictMode's double mount", () => {
    harness.render(
      React.createElement(
        React.StrictMode,
        null,
        React.createElement(Player, {
          themeNo: "1",
          currentTry: 0,
          setStartTime,
          startTime: 10,
          inputRef: React.createRef<HTMLInputElement>(),
          keyboardEnabled: true,
        })
      )
    );
    fire("loadedmetadata");

    expect(
      container.querySelector('button[aria-label="Play clip"]')
    ).not.toBeNull();
  });
});

/**
 * Every control is gated on the metadata, so a file that will not play would
 * leave the round on "Loading player..." forever with no explanation and no
 * way to move on. These cover the way out.
 */
describe("Player when the file cannot be played", () => {
  it("explains the failure instead of loading forever", () => {
    mount(10, 0, true, true, false);
    fire("error");

    const alert = container.querySelector('[role="alert"]');
    expect(alert).not.toBeNull();
    expect(alert?.textContent).toContain("won’t play");
    expect(container.textContent).not.toContain("Loading player");
  });

  it("remembers the song so the bag stops dealing it", () => {
    mount(10, 0, true, true, false);
    expect(isUnplayable("1")).toBe(false);

    fire("error");

    expect(isUnplayable("1")).toBe(true);
  });

  it("offers a replacement song in endless mode", () => {
    mount(10, 0, true, true, false);
    fire("error");

    act(() => {
      buttonWith("Skip this track")?.click();
    });

    expect(skipTrack).toHaveBeenCalled();
  });

  it("offers no replacement in daily mode, since the puzzle is shared", () => {
    mount(10, 0, true, false, false);
    fire("error");

    expect(buttonWith("Skip this track")).toBeUndefined();
    expect(container.textContent).toContain("still guess or skip");
  });

  it("recovers when a retry succeeds", () => {
    mount(10, 0, true, true, false);
    fire("error");
    const failed = audio();

    act(() => {
      buttonWith("Try again")?.click();
    });

    // The retry mounts a fresh element, which starts a new request.
    expect(audio()).not.toBe(failed);
    fire("loadedmetadata");

    expect(container.querySelector('[role="alert"]')).toBeNull();
    expect(
      container.querySelector('button[aria-label="Play clip"]')
    ).not.toBeNull();
  });
});

describe("Player when the file never arrives", () => {
  it("gives up waiting and says so", () => {
    mount(10, 0, true, true, false);

    expect(container.textContent).toContain("Loading player");

    act(() => {
      vi.advanceTimersByTime(12_000);
    });

    expect(container.textContent).toContain("didn’t load");
    expect(container.querySelector('[role="alert"]')).not.toBeNull();
  });

  it("does not blame the song for what may be the connection", () => {
    mount(10, 0, true, true, false);

    act(() => {
      vi.advanceTimersByTime(12_000);
    });

    // A timeout is not evidence the file is broken, so it stays in the bag.
    expect(isUnplayable("1")).toBe(false);
  });

  it("keeps waiting while the file is still within its grace period", () => {
    mount(10, 0, true, true, false);

    act(() => {
      vi.advanceTimersByTime(11_000);
    });

    expect(container.textContent).toContain("Loading player");
  });
});
