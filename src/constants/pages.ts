import type { Game } from "../types/mode";

/**
 * The site's pages: the hub at the root, a page for each game,
 * multiplayer's rooms, which play the OST, Voice and Picture games
 * together, and the privacy policy. Each is
 * its own HTML file, written at build time from index.html by the
 * "game-pages" plugin in vite.config.ts, so its title, description and link
 * preview are in the file itself: X and Discord read the tags without running
 * any JavaScript. The app reads the same table to name the tab as the player
 * moves between pages without a reload.
 */
export type Page = "hub" | Game | "multiplayer" | "privacy";

export interface PageInfo {
  /** Where the page lives, with no slash at the end but the root's. */
  path: string;
  /** The built file, served at `path` (html_handling in site-worker/). */
  file: string;
  title: string;
  /**
   * For search results and link previews alike; under about 160 characters,
   * so Google doesn't cut it short.
   */
  description: string;
  /**
   * The link preview's picture, from the site's root (drawn by
   * scripts/make-preview.mjs), and what it shows, for screen readers.
   */
  preview: string;
  previewAlt: string;
}

/**
 * Bumped with every new drawing of the previews: X, Discord and the like
 * keep a copy of a picture per address.
 */
const PREVIEW_VERSION = 3;

const previewOf = (file: string) => `/${file}.jpg?v=${PREVIEW_VERSION}`;

export const SITE_ORIGIN = "https://baheardle.com";

export const PAGES: Record<Page, PageInfo> = {
  hub: {
    path: "/",
    file: "index.html",
    title: "Blue Archive Heardle - Guess the OST, Voices, Halos and Students",
    description:
      "Daily Blue Archive guessing games: name the OST from a short clip, or a student from a voice line, halo, weapon or clues. Free, with no ads or sign-up.",
    preview: previewOf("preview"),
    previewAlt:
      "Blue Archive Heardle: Mari beside the OST, Voice, Halo and Weapon, Students and Multiplayer games",
  },
  ost: {
    path: "/ost",
    file: "ost.html",
    title: "Guess the Blue Archive OST - Blue Archive Heardle",
    description:
      "Hear a short clip of a Blue Archive song and name it in six tries; each miss plays more. A daily puzzle, endless play, 4-Choice and Time Attack.",
    preview: previewOf("previews/ost"),
    previewAlt:
      "Guess the Blue Archive OST: Mari beside Daily, Classic, 4-Choice and Time Attack",
  },
  voice: {
    path: "/voice",
    file: "voice.html",
    title: "Guess the Blue Archive Student by Voice - Blue Archive Heardle",
    description:
      "Hear a student's title call or lobby line and name them, with a hint after each miss: school, club, silhouette. Daily, endless, 4-Choice and Time Attack.",
    preview: previewOf("previews/voice"),
    previewAlt:
      "Guess the student by voice: Mari beside Daily, Classic, 4-Choice and Time Attack",
  },
  students: {
    path: "/students",
    file: "students.html",
    title: "Guess the Blue Archive Student from Clues - Blue Archive Heardle",
    description:
      "Name the Blue Archive student: each guess shows how their school, role, weapon, birthday and more compare. Gameplay or Lore, daily and endless.",
    preview: previewOf("previews/students"),
    previewAlt:
      "Guess the student from clues: Mari beside Daily, Endless, Gameplay and Lore",
  },
  picture: {
    path: "/picture",
    file: "picture.html",
    title:
      "Guess the Blue Archive Student by Halo or Weapon - Blue Archive Heardle",
    description:
      "Name the Blue Archive student from their halo or weapon, or only its silhouette. A daily puzzle, endless play, 4-Choice and Time Attack.",
    preview: previewOf("previews/picture"),
    previewAlt:
      "Guess the student by halo or weapon: Mari beside Daily, Classic, 4-Choice and Time Attack",
  },
  multiplayer: {
    path: "/multiplayer",
    file: "multiplayer.html",
    title:
      "Blue Archive Music and Student Quiz with Friends - Blue Archive Heardle",
    description:
      "Make a private room and guess Blue Archive songs, voices, halos or weapons with up to 8 friends, everyone hearing the same song at once. Free, no sign-up.",
    preview: previewOf("previews/multiplayer"),
    previewAlt:
      "Blue Archive Heardle with friends: Mari beside private rooms for 2 to 8 players, no sign-up",
  },
  privacy: {
    path: "/privacy",
    file: "privacy.html",
    title: "Privacy - Blue Archive Heardle",
    description:
      "What Blue Archive Heardle keeps: nothing but your browser's saves when you play, and only what an optional account needs when you sign in.",
    preview: previewOf("preview"),
    previewAlt:
      "Blue Archive Heardle: Mari beside the OST, Voice, Halo and Weapon, Students and Multiplayer games",
  },
};

/**
 * Every page, the hub first, in the order the game switch shows them:
 * the games, then multiplayer.
 */
export const PAGE_ORDER: Page[] = [
  "hub",
  "ost",
  "voice",
  "picture",
  "students",
  "multiplayer",
];

/**
 * Every page there is: the bar's, then the privacy policy, which the
 * footer, About and the Account tab link to (Google's and Discord's
 * sign-in screens too).
 */
export const SITE_PAGES: Page[] = [...PAGE_ORDER, "privacy"];

/** Whether a page is one of the games, which remember their saves. */
export function isGamePage(page: Page): page is Game {
  return page !== "hub" && page !== "multiplayer" && page !== "privacy";
}

/** The page's full address, for share texts and the canonical tag. */
export function pageUrl(page: Page): string {
  return SITE_ORIGIN + PAGES[page].path;
}

/**
 * Which page a path is. Anything unknown is the hub, as the site answers
 * an unknown path with the hub's page (404.html) and a 404 status.
 */
export function pageOfPath(pathname: string): Page {
  const path = pathname.replace(/\.html$/, "").replace(/\/+$/, "") || "/";
  const found = SITE_PAGES.find((page) => PAGES[page].path === path);
  return found ?? "hub";
}
