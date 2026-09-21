import React, { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createHarness } from "../../test/harness";

import { playTimes } from "../../constants";

const DURATION = 200;

/**
 * Stands in for the raw YT.Player the IFrame API hands to onReady. Every method
 * is synchronous on purpose: typing these as promise-returning is exactly what
 * broke loading, the start time, the clip cap and the progress bar.
 */
const fake = vi.hoisted(() => {
  const state = { now: 0, duration: 200, autoReady: true };
  const handlers: {
    onError?: (event: { data: number }) => void;
  } = {};

  return {
    state,
    handlers,
    player: {
      playVideo: vi.fn(),
      pauseVideo: vi.fn(),
      seekTo: vi.fn((seconds: number) => {
        state.now = seconds;
      }),
      setVolume: vi.fn(),
      getCurrentTime: vi.fn(() => state.now),
      getDuration: vi.fn(() => state.duration),
      getIframe: vi.fn(() => document.createElement("iframe")),
    },
  };
});

vi.mock("react-youtube", async () => {
  const react = await import("react");

  return {
    default: ({
      onReady,
      onError,
    }: {
      onReady: (event: unknown) => void;
      onError: (event: { data: number }) => void;
    }) => {
      react.useEffect(() => {
        fake.handlers.onError = onError;
        // A blocked or never-loading video never fires onReady - that is the
        // case the error handling exists for.
        if (fake.state.autoReady) onReady({ target: fake.player });
      }, [onReady, onError]);

      return null;
    },
  };
});

// Imported after the mock so the component picks up the stub.
const { Player } = await import("./index");
const { clearUnplayable, isUnplayable } = await import(
  "../../helpers/unplayable"
);

let harness: ReturnType<typeof createHarness>;
let container: HTMLDivElement;
const setStartTime = vi.fn();
const skipTrack = vi.fn();

function mount(
  startTime: number | null = null,
  currentTry = 0,
  keyboardEnabled = true,
  // Daily mode passes no skip handler, since its puzzle cannot be swapped.
  canSkipTrack = true
) {
  harness.render(
    React.createElement(Player, {
      id: "SHkF48SgiSA",
      currentTry,
      setStartTime,
      startTime,
      inputRef: React.createRef<HTMLInputElement>(),
      keyboardEnabled,
      onSkipTrack: canSkipTrack ? skipTrack : undefined,
    })
  );
}

function fireError(code = 150) {
  act(() => {
    fake.handlers.onError?.({ data: code });
  });
}

function buttonWith(text: string) {
  return Array.from(container.querySelectorAll("button")).find((button) =>
    button.textContent?.includes(text)
  );
}

/** Moves playback forward and lets the 250ms poll observe it. */
function advancePlayback(seconds: number) {
  act(() => {
    fake.state.now += seconds;
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
  fake.state.now = 0;
  fake.state.duration = DURATION;
  fake.state.autoReady = true;
  fake.handlers.onError = undefined;
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
  it("leaves the loading state once the player is ready", () => {
    mount();

    expect(container.textContent).not.toContain("Loading player");
  });

  it("rolls a non-zero start time and reports it upwards", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);

    mount(null);

    // (200 - 16) * 0.5 = 92
    expect(setStartTime).toHaveBeenCalledWith(92);
    expect(fake.player.seekTo).toHaveBeenCalledWith(92, true);
  });

  it("does not re-roll a start time already stored for the round", () => {
    mount(42);

    expect(setStartTime).not.toHaveBeenCalled();
    expect(fake.player.seekTo).toHaveBeenCalledWith(42, true);
  });

  it("survives a player that reports no duration", () => {
    fake.state.duration = 0;

    expect(() => mount(null)).not.toThrow();
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
    // handleReady pauses once to hold the clip at its start.
    fake.player.pauseVideo.mockClear();

    clickTransport();
    expect(fake.player.playVideo).toHaveBeenCalled();

    // playTimes[0] is 1000ms, so 0.5s in it must still be running.
    advancePlayback(0.5);
    expect(fake.player.pauseVideo).not.toHaveBeenCalled();

    advancePlayback(0.75);
    expect(fake.player.pauseVideo).toHaveBeenCalled();
    expect(fake.player.seekTo).toHaveBeenLastCalledWith(10, true);
  });

  it("gives a later try a longer clip", () => {
    mount(10, 3);
    fake.player.pauseVideo.mockClear();

    clickTransport();

    // playTimes[3] is 7000ms, so 5s in the clip is still running.
    advancePlayback(5);
    expect(fake.player.pauseVideo).not.toHaveBeenCalled();

    advancePlayback(2.5);
    expect(fake.player.pauseVideo).toHaveBeenCalled();
  });

  it("polls only while playing", () => {
    mount(10);
    fake.player.getCurrentTime.mockClear();

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(fake.player.getCurrentTime).not.toHaveBeenCalled();

    clickTransport();
    act(() => {
      vi.advanceTimersByTime(250);
    });
    expect(fake.player.getCurrentTime).toHaveBeenCalled();
  });

  // YouTube refuses to load or play a player it considers invisible, which is
  // how the clip player was broken once already.
  it("keeps the player mounted visibly rather than hidden", () => {
    mount(10);

    const wrapper = container.children[0] as HTMLElement;
    const style = getComputedStyle(wrapper);

    expect(style.opacity).not.toBe("0");
    expect(style.display).not.toBe("none");
    expect(style.visibility).not.toBe("hidden");
  });

  it("gives the player wrapper a real size", () => {
    mount(10);

    const style = getComputedStyle(container.children[0] as HTMLElement);

    // A 1px or 0px box reads as hidden to YouTube.
    expect(style.width).not.toMatch(/^[01]px$/);
    expect(style.height).not.toMatch(/^[01]px$/);
  });

  it("responds to Space when the keyboard is live", () => {
    mount(10);

    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { code: "Space" }));
    });

    expect(fake.player.playVideo).toHaveBeenCalled();
  });

  it("ignores Space while a dialog is open", () => {
    mount(10, 0, false);

    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { code: "Space" }));
    });

    expect(fake.player.playVideo).not.toHaveBeenCalled();
  });

  it("keeps the longest clip within the track", () => {
    expect(playTimes[playTimes.length - 1] / 1000).toBe(16);

    vi.spyOn(Math, "random").mockReturnValue(0.999999);
    mount(null);

    const rolled = setStartTime.mock.calls[0][0] as number;
    expect(rolled + 16).toBeLessThanOrEqual(DURATION);
  });
});

/**
 * Every control used to be gated on onReady, so a video YouTube refuses to play
 * left the round on "Loading player..." forever with no explanation and no way
 * to move on. These cover the way out.
 */
describe("Player when the video cannot be played", () => {
  it("explains the failure instead of loading forever", () => {
    mount(10);
    fireError();

    const alert = container.querySelector('[role="alert"]');
    expect(alert).not.toBeNull();
    expect(alert?.textContent).toContain("won’t play");
    expect(container.textContent).not.toContain("Loading player");
  });

  it("remembers the video so the bag stops dealing it", () => {
    mount(10);
    expect(isUnplayable("SHkF48SgiSA")).toBe(false);

    fireError();

    expect(isUnplayable("SHkF48SgiSA")).toBe(true);
  });

  it("offers a replacement song in endless mode", () => {
    mount(10);
    fireError();

    act(() => {
      buttonWith("Skip this track")?.click();
    });

    expect(skipTrack).toHaveBeenCalled();
  });

  it("offers no replacement in daily mode, since the puzzle is shared", () => {
    mount(10, 0, true, false);
    fireError();

    expect(buttonWith("Skip this track")).toBeUndefined();
    expect(container.textContent).toContain("still guess or skip");
  });

  it("recovers when a retry succeeds", () => {
    mount(10);
    fireError();
    expect(container.querySelector('[role="alert"]')).not.toBeNull();

    act(() => {
      buttonWith("Try again")?.click();
    });

    // The remounted stub reports ready again, so the controls come back.
    expect(container.querySelector('[role="alert"]')).toBeNull();
    expect(
      container.querySelector('button[aria-label="Play clip"]')
    ).not.toBeNull();
  });
});

describe("Player when the API never answers", () => {
  it("gives up waiting and says so", () => {
    fake.state.autoReady = false;
    mount(10);

    expect(container.textContent).toContain("Loading player");

    act(() => {
      vi.advanceTimersByTime(12_000);
    });

    expect(container.textContent).toContain("didn’t load");
    expect(container.querySelector('[role="alert"]')).not.toBeNull();
  });

  it("does not blame the video for what may be the connection", () => {
    fake.state.autoReady = false;
    mount(10);

    act(() => {
      vi.advanceTimersByTime(12_000);
    });

    // A timeout is not evidence the video is gone, so it stays in the bag.
    expect(isUnplayable("SHkF48SgiSA")).toBe(false);
  });

  it("keeps waiting while the player is still within its grace period", () => {
    fake.state.autoReady = false;
    mount(10);

    act(() => {
      vi.advanceTimersByTime(11_000);
    });

    expect(container.textContent).toContain("Loading player");
  });
});
