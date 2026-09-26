import { flushSync } from "react-dom";

import { ColorScheme, themes } from "../constants/theme";
import { loadColorScheme, saveColorScheme } from "./storage";

const DARK_QUERY = "(prefers-color-scheme: dark)";

/** How long the colour fade runs where view transitions are unsupported. */
const FADE_MS = 450;
const REVEAL_MS = 650;
/** Longest wait for the other background before switching without it. */
const PRELOAD_TIMEOUT_MS = 1000;

/**
 * The scheme the player picked. `undefined` until storage has been read;
 * `null` once read, if they never picked one - the device decides then.
 */
let chosen: ColorScheme | null | undefined;

const listeners = new Set<() => void>();

function matches(query: string): boolean {
  // jsdom and very old browsers have no matchMedia.
  return typeof window.matchMedia === "function"
    ? window.matchMedia(query).matches
    : false;
}

function readChoice(): ColorScheme | null {
  if (chosen === undefined) chosen = loadColorScheme();
  return chosen;
}

export function getColorScheme(): ColorScheme {
  return readChoice() ?? (matches(DARK_QUERY) ? "dark" : "light");
}

export function setColorScheme(scheme: ColorScheme): void {
  chosen = scheme;
  saveColorScheme(scheme);
  listeners.forEach((listener) => listener());
}

export function subscribeColorScheme(listener: () => void): () => void {
  listeners.add(listener);

  // Until the player picks, follow the device when it changes - e.g. a phone
  // that goes dark at sunset.
  const media =
    typeof window.matchMedia === "function"
      ? window.matchMedia(DARK_QUERY)
      : null;
  const handleDeviceChange = () => {
    if (readChoice() === null) listener();
  };
  media?.addEventListener("change", handleDeviceChange);

  return () => {
    listeners.delete(listener);
    media?.removeEventListener("change", handleDeviceChange);
  };
}

/**
 * Tells the browser as well as the page: `color-scheme` darkens native parts
 * such as scrollbars and form controls, and theme-color tints the phone's
 * address bar.
 */
export function applyColorSchemeToDocument(scheme: ColorScheme): void {
  const root = document.documentElement;
  root.dataset.scheme = scheme;
  root.style.colorScheme = scheme;

  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", themes[scheme].background1);
}

/** Resolves once the image is ready, or gives up rather than stall. */
function preload(src: string): Promise<void> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve();
    image.onerror = () => resolve();
    image.src = src;
    window.setTimeout(resolve, PRELOAD_TIMEOUT_MS);
  });
}

/**
 * Switches scheme with an animation: a circle of the new scheme spreading out
 * from `origin` where view transitions are supported, and a short colour fade
 * elsewhere.
 *
 * While it runs, the page carries `data-scheme-switching`: the cursor
 * effects hold off then, since drawing them over the reveal made it stutter.
 */
export async function switchColorScheme(
  next: ColorScheme,
  origin?: { x: number; y: number }
): Promise<void> {
  const root = document.documentElement;
  // flushSync so the page has fully repainted in the new scheme by the time
  // the browser takes its "after" picture.
  const apply = () => flushSync(() => setColorScheme(next));

  root.dataset.schemeSwitching = "";
  const done = () => delete root.dataset.schemeSwitching;

  if (typeof document.startViewTransition !== "function") {
    root.classList.add("scheme-fading");
    apply();
    window.setTimeout(() => {
      root.classList.remove("scheme-fading");
      done();
    }, FADE_MS);
    return;
  }

  // Otherwise the reveal can uncover a background that hasn't loaded yet.
  await preload(themes[next].backgroundImage);

  const transition = document.startViewTransition(apply);
  transition.finished.then(done, done);
  if (!origin) return;

  try {
    await transition.ready;
  } catch {
    return; // Skipped, e.g. by a second click before this one started.
  }

  const radius = Math.hypot(
    Math.max(origin.x, window.innerWidth - origin.x),
    Math.max(origin.y, window.innerHeight - origin.y)
  );

  document.documentElement.animate(
    {
      clipPath: [
        `circle(0px at ${origin.x}px ${origin.y}px)`,
        `circle(${radius}px at ${origin.x}px ${origin.y}px)`,
      ],
    },
    {
      duration: REVEAL_MS,
      easing: "cubic-bezier(0.4, 0, 0.2, 1)",
      pseudoElement: "::view-transition-new(root)",
    }
  );
}

/** Test seam - this is module state that would otherwise leak across tests. */
export function resetColorSchemeState(): void {
  chosen = undefined;
}
