import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Player } from "./index";
import { createHarness } from "../../test/harness";
import { clearUnplayable, isUnplayable } from "../../helpers/unplayable";

/**
 * Drives the REAL react-youtube and youtube-player against a fake YT.Player.
 * The other Player tests mock react-youtube away, so only this one can catch
 * breakage in how the library manages the iframe's lifecycle.
 *
 * The fake mirrors the two behaviours that matter: constructing a player
 * REPLACES the container element with an iframe, and destroying one REMOVES
 * that iframe. A player that is built and then torn down therefore leaves no
 * iframe behind - which is what "it appears and disappears" looks like.
 */
let readyCalls = 0;
/** When set, the fake reports this error code instead of becoming ready. */
let failWithCode: number | null = null;

class FakeYTPlayer {
  private iframe: HTMLIFrameElement | null = null;

  constructor(element: HTMLElement | string, options: Record<string, unknown>) {
    if (typeof element !== "string" && element.parentNode) {
      this.iframe = document.createElement("iframe");
      this.iframe.setAttribute("data-fake-yt", "1");
      element.parentNode.replaceChild(this.iframe, element);
    }

    const events = options.events as
      | Record<string, (e: unknown) => void>
      | undefined;

    // The real API fires these asynchronously.
    setTimeout(() => {
      if (!this.iframe?.isConnected) return;

      // A removed, private, region-locked or embedding-disabled video loads an
      // iframe and then reports an error; onReady never comes.
      if (failWithCode !== null) {
        events?.onError?.({ data: failWithCode, target: this });
        return;
      }

      readyCalls += 1;
      events?.onReady?.({ target: this });
    }, 0);
  }

  destroy() {
    this.iframe?.remove();
    this.iframe = null;
  }

  getCurrentTime() {
    return 12;
  }
  getDuration() {
    return 200;
  }
  getIframe() {
    return this.iframe ?? document.createElement("iframe");
  }
  playVideo() {}
  pauseVideo() {}
  seekTo() {}
  setVolume() {}
  getPlayerState() {
    return 1;
  }
  addEventListener() {}
  removeEventListener() {}
}

let harness: ReturnType<typeof createHarness>;
const setStartTime = vi.fn();

function settle() {
  return new Promise((resolve) => setTimeout(resolve, 250));
}

/**
 * In a browser the IFrame API arrives over the network after mount. Making it
 * available synchronously closes the race window that this test exists to
 * exercise.
 */
function provideApiAfter(ms: number) {
  setTimeout(() => {
    (window as unknown as { YT: unknown }).YT = { Player: FakeYTPlayer };
    (
      window as unknown as { onYouTubeIframeAPIReady?: () => void }
    ).onYouTubeIframeAPIReady?.();
  }, ms);
}

function renderPlayer(strict: boolean, onSkipTrack?: () => void) {
  const element = React.createElement(Player, {
    id: "SHkF48SgiSA",
    currentTry: 0,
    setStartTime,
    startTime: 10,
    inputRef: React.createRef<HTMLInputElement>(),
    keyboardEnabled: true,
    onSkipTrack,
  });

  harness.render(
    strict ? React.createElement(React.StrictMode, null, element) : element
  );
}

function iframeCount() {
  return harness.container.querySelectorAll("iframe[data-fake-yt]").length;
}

beforeEach(() => {
  readyCalls = 0;
  failWithCode = null;
  clearUnplayable();
  harness = createHarness();
});

afterEach(() => {
  harness.destroy();
  delete (window as unknown as { YT?: unknown }).YT;
  delete (window as unknown as { onYouTubeIframeAPIReady?: unknown })
    .onYouTubeIframeAPIReady;
});

describe("Player against the real react-youtube", () => {
  it("leaves a live iframe on a plain mount", async () => {
    provideApiAfter(20);
    renderPlayer(false);
    await settle();

    expect(iframeCount()).toBe(1);
    expect(readyCalls).toBeGreaterThan(0);
    expect(harness.container.textContent).not.toContain("Loading player");
  });

  it("leaves a live iframe after a StrictMode double mount", async () => {
    provideApiAfter(20);
    renderPlayer(true);
    await settle();

    // StrictMode mounts, unmounts and remounts. If the library recreates the
    // player without waiting for the pending destroy, the iframe is torn down
    // right after it appears and never comes back.
    expect(iframeCount()).toBe(1);
    expect(readyCalls).toBeGreaterThan(0);
    expect(harness.container.textContent).not.toContain("Loading player");
  });
});

/**
 * The failure path is handled by OUR onError prop, but whether the event ever
 * reaches it depends on react-youtube and youtube-player forwarding the IFrame
 * API's error event. The unit tests call the handler directly and so cannot
 * prove that; only this one goes through the real library.
 */
describe("Player error handling through the real react-youtube", () => {
  it("surfaces an IFrame API error rather than loading forever", async () => {
    // 150: the owner does not allow this video to be embedded.
    failWithCode = 150;
    provideApiAfter(20);
    renderPlayer(false);
    await settle();

    const alert = harness.container.querySelector('[role="alert"]');
    expect(alert).not.toBeNull();
    expect(alert?.textContent).toContain("won’t play");
    expect(harness.container.textContent).not.toContain("Loading player");
  });

  it("keeps the failing video out of the rest of the session", async () => {
    failWithCode = 100;
    provideApiAfter(20);
    renderPlayer(false);
    await settle();

    expect(isUnplayable("SHkF48SgiSA")).toBe(true);
  });

  it("offers a replacement when one can be dealt", async () => {
    const onSkipTrack = vi.fn();
    failWithCode = 150;
    provideApiAfter(20);
    renderPlayer(false, onSkipTrack);
    await settle();

    const skip = Array.from(harness.container.querySelectorAll("button")).find(
      (button) => button.textContent?.includes("Skip this track")
    );

    expect(skip).toBeDefined();
    skip!.click();
    expect(onSkipTrack).toHaveBeenCalled();
  });
});
