import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Player } from "./index";
import { createHarness } from "../../test/harness";

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

    // The real API fires onReady asynchronously.
    setTimeout(() => {
      if (!this.iframe?.isConnected) return;
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

function renderPlayer(strict: boolean) {
  const element = React.createElement(Player, {
    id: "SHkF48SgiSA",
    currentTry: 0,
    setStartTime,
    startTime: 10,
    inputRef: React.createRef<HTMLInputElement>(),
    keyboardEnabled: true,
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
