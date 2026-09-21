import React, { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createHarness } from "../../test/harness";

const fake = vi.hoisted(() => ({
  onReady: undefined as ((event: unknown) => void) | undefined,
  onError: undefined as (() => void) | undefined,
  player: {
    seekTo: vi.fn(),
    setVolume: vi.fn(),
  },
}));

vi.mock("react-youtube", async () => {
  const react = await import("react");

  return {
    default: (props: {
      onReady: (event: unknown) => void;
      onError: () => void;
    }) => {
      fake.onReady = props.onReady;
      fake.onError = props.onError;
      return react.createElement("iframe", { title: "player" });
    },
  };
});

const { YouTube } = await import("./index");
const { clearUnplayable, isUnplayable } = await import(
  "../../helpers/unplayable"
);

let harness: ReturnType<typeof createHarness>;

function mount(startTime = 12) {
  harness.render(
    React.createElement(YouTube, { id: "SHkF48SgiSA", startTime })
  );
}

function fireReady() {
  act(() => {
    fake.onReady?.({ target: fake.player });
  });
}

function fireError() {
  act(() => {
    fake.onError?.();
  });
}

function placeholder() {
  return Array.from(harness.container.querySelectorAll("div")).find((el) =>
    el.textContent?.includes("Loading the track")
  );
}

beforeEach(() => {
  fake.onReady = undefined;
  fake.onError = undefined;
  clearUnplayable();
  harness = createHarness();
});

afterEach(() => {
  harness.destroy();
});

describe("YouTube result player", () => {
  it("covers the black iframe with a placeholder until it is ready", () => {
    mount();

    expect(placeholder()).toBeDefined();
  });

  it("removes the placeholder once the player reports ready", () => {
    mount();
    fireReady();

    expect(placeholder()).toBeUndefined();
  });

  it("seeks to the round's clip start and lowers the volume", () => {
    mount(42);
    fireReady();

    expect(fake.player.seekTo).toHaveBeenCalledWith(42, true);
    expect(fake.player.setVolume).toHaveBeenCalledWith(20);
  });

  it("reserves the player's box so the layout does not jump", () => {
    mount();

    const frame = harness.container.firstElementChild as HTMLElement;
    expect(frame.style.width).toBe("560px");
    expect(frame.style.height).toBe("315px");
  });

  // Hiding the iframe is what made YouTube refuse to load it once before, so
  // the placeholder must be an overlay rather than a style on the iframe.
  it("never hides the iframe itself", () => {
    mount();

    const iframe = harness.container.querySelector("iframe")!;
    const style = getComputedStyle(iframe);

    expect(style.opacity).not.toBe("0");
    expect(style.display).not.toBe("none");
    expect(style.visibility).not.toBe("hidden");
  });
});

/**
 * The reveal used to sit behind "Loading the track…" forever when the video
 * would not play, so the answer could never be heard and nothing said why.
 */
describe("YouTube result player when the video will not play", () => {
  it("offers a link to YouTube instead of a placeholder that never clears", () => {
    mount();
    fireError();

    expect(placeholder()).toBeUndefined();
    expect(harness.container.textContent).toContain("won’t play here");

    const link = harness.container.querySelector("a");
    expect(link?.getAttribute("href")).toBe(
      "https://www.youtube.com/watch?v=SHkF48SgiSA"
    );
    expect(link?.getAttribute("rel")).toContain("noopener");
  });

  it("remembers the video so the rest of the session skips it", () => {
    mount();
    fireError();

    expect(isUnplayable("SHkF48SgiSA")).toBe(true);
  });

  it("gives up on a load that never finishes", () => {
    vi.useFakeTimers();
    mount();

    expect(placeholder()).toBeDefined();

    act(() => {
      vi.advanceTimersByTime(12_000);
    });

    expect(harness.container.textContent).toContain("won’t play here");
    vi.useRealTimers();
  });
});
