import { describe, expect, it, vi } from "vitest";

import { JUKEBOX_VOLUME_KEY, VOLUME_KEY } from "../constants/game";
import { loadVolume } from "./storage";
import {
  canSetVolume,
  getVolume,
  setVolume,
  subscribeVolume,
  toggleMute,
} from "./volume";

describe("loadVolume", () => {
  it("starts a new player at 20%", () => {
    expect(loadVolume()).toBe(0.2);
  });

  it("gives a returning player their own level back", () => {
    localStorage.setItem(VOLUME_KEY, "0.65");

    expect(loadVolume()).toBe(0.65);
  });

  it("keeps a deliberate mute", () => {
    localStorage.setItem(VOLUME_KEY, "0");

    expect(loadVolume()).toBe(0);
  });

  it.each(["", "loud", "1.5", "-0.1", "NaN"])(
    "falls back to the default for a corrupted value (%j)",
    (stored) => {
      localStorage.setItem(VOLUME_KEY, stored);

      expect(loadVolume()).toBe(0.2);
    }
  );
});

describe("volume", () => {
  it("remembers a change across visits", () => {
    setVolume(0.8);

    expect(localStorage.getItem(VOLUME_KEY)).toBe("0.8");
  });

  it("keeps the level between 0 and 1", () => {
    setVolume(3);
    expect(getVolume()).toBe(1);

    setVolume(-1);
    expect(getVolume()).toBe(0);
  });

  it("tells every listener about a change", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeVolume(listener);

    setVolume(0.5);
    expect(listener).toHaveBeenCalledOnce();

    unsubscribe();
    setVolume(0.6);
    expect(listener).toHaveBeenCalledOnce();
  });

  it("unmutes back to the level the player had", () => {
    setVolume(0.55);

    toggleMute();
    expect(getVolume()).toBe(0);

    toggleMute();
    expect(getVolume()).toBe(0.55);
  });

  it("unmutes a player who arrived muted to the default", () => {
    localStorage.setItem(VOLUME_KEY, "0");

    toggleMute();

    expect(getVolume()).toBe(0.2);
  });
});

describe("canSetVolume", () => {
  it("is true where the browser honours the volume property", () => {
    expect(canSetVolume()).toBe(true);
  });

  it("is false where volume reads back as 1 regardless, as on iOS", () => {
    vi.spyOn(HTMLMediaElement.prototype, "volume", "get").mockReturnValue(1);

    expect(canSetVolume()).toBe(false);
  });
});

describe("the Jukebox's volume", () => {
  it("starts at the game's level", () => {
    localStorage.setItem(VOLUME_KEY, "0.4");

    expect(getVolume("jukebox")).toBe(0.4);
  });

  it("moves without moving the game's", () => {
    setVolume(0.3);
    setVolume(0.9, "jukebox");

    expect(getVolume()).toBe(0.3);
    expect(getVolume("jukebox")).toBe(0.9);
    expect(localStorage.getItem(JUKEBOX_VOLUME_KEY)).toBe("0.9");
  });

  it("mutes on its own", () => {
    setVolume(0.5);
    setVolume(0.7, "jukebox");

    toggleMute("jukebox");

    expect(getVolume("jukebox")).toBe(0);
    expect(getVolume()).toBe(0.5);
  });
});
