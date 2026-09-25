import { afterEach, describe, expect, it, vi } from "vitest";

import { COLOR_SCHEME_KEY } from "../constants/game";
import { darkTheme, theme } from "../constants/theme";
import {
  applyColorSchemeToDocument,
  getColorScheme,
  setColorScheme,
  subscribeColorScheme,
  switchColorScheme,
} from "./colorScheme";

type Listener = () => void;

/** A stand-in for matchMedia, since jsdom has none. */
function stubMedia(queries: Record<string, boolean>) {
  const changeListeners: Listener[] = [];

  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      matches: queries[query] ?? false,
      addEventListener: (_: string, listener: Listener) =>
        changeListeners.push(listener),
      removeEventListener: vi.fn(),
    }))
  );

  return {
    set(query: string, value: boolean) {
      queries[query] = value;
      changeListeners.forEach((listener) => listener());
    },
  };
}

const DARK = "(prefers-color-scheme: dark)";
const REDUCED = "(prefers-reduced-motion: reduce)";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  document.documentElement.className = "";
});

describe("color scheme", () => {
  it("follows the device for a player who never picked", () => {
    stubMedia({ [DARK]: true });
    expect(getColorScheme()).toBe("dark");
  });

  it("defaults to light where the device says nothing", () => {
    expect(getColorScheme()).toBe("light");
  });

  it("prefers the player's own pick over the device", () => {
    stubMedia({ [DARK]: true });
    localStorage.setItem(COLOR_SCHEME_KEY, "light");

    expect(getColorScheme()).toBe("light");
  });

  it("ignores a corrupted saved value", () => {
    localStorage.setItem(COLOR_SCHEME_KEY, "purple");

    expect(getColorScheme()).toBe("light");
  });

  it("saves a pick and tells listeners", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeColorScheme(listener);

    setColorScheme("dark");

    expect(localStorage.getItem(COLOR_SCHEME_KEY)).toBe("dark");
    expect(getColorScheme()).toBe("dark");
    expect(listener).toHaveBeenCalledOnce();
    unsubscribe();
  });

  it("follows a device change until the player picks", () => {
    const media = stubMedia({ [DARK]: false });
    const listener = vi.fn();
    subscribeColorScheme(listener);

    media.set(DARK, true);
    expect(listener).toHaveBeenCalledOnce();
    expect(getColorScheme()).toBe("dark");

    setColorScheme("light");
    listener.mockClear();
    media.set(DARK, false);
    expect(listener).not.toHaveBeenCalled();
  });
});

describe("applyColorSchemeToDocument", () => {
  it("tells the browser too, for native controls and the address bar", () => {
    const meta = document.createElement("meta");
    meta.name = "theme-color";
    document.head.appendChild(meta);

    applyColorSchemeToDocument("dark");

    expect(document.documentElement.dataset.scheme).toBe("dark");
    expect(document.documentElement.style.colorScheme).toBe("dark");
    expect(meta.content).toBe(darkTheme.background1);
    meta.remove();
  });
});

describe("switchColorScheme", () => {
  it("fades the colours where view transitions are unsupported", async () => {
    vi.useFakeTimers();

    await switchColorScheme("dark");

    expect(getColorScheme()).toBe("dark");
    expect(document.documentElement.classList).toContain("scheme-fading");

    vi.advanceTimersByTime(450);
    expect(document.documentElement.classList).not.toContain("scheme-fading");
  });

  it("switches instantly for anyone who asked for reduced motion", async () => {
    stubMedia({ [REDUCED]: true });

    await switchColorScheme("dark");

    expect(getColorScheme()).toBe("dark");
    expect(document.documentElement.classList).not.toContain("scheme-fading");
  });
});

describe("themes", () => {
  it("gives the dark theme a value for every token the light one has", () => {
    expect(Object.keys(darkTheme).sort()).toEqual(Object.keys(theme).sort());
    expect(darkTheme.backgroundImage).not.toBe(theme.backgroundImage);
  });
});
