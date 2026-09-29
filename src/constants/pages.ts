import type { Game } from "../types/mode";

/**
 * The site's pages: the hub at the root, and a page for each game. Each is
 * its own HTML file, written at build time from index.html by the
 * "game-pages" plugin in vite.config.ts, so its title, description and link
 * preview are in the file itself: X and Discord read the tags without running
 * any JavaScript. The app reads the same table to name the tab as the player
 * moves between pages without a reload.
 */
export type Page = "hub" | Game;

export interface PageInfo {
  /** Where the page lives, with no slash at the end but the root's. */
  path: string;
  /** The built file, served at `path` by Vercel's clean URLs. */
  file: string;
  title: string;
  /**
   * For search results and link previews alike; under about 160 characters,
   * so Google doesn't cut it short.
   */
  description: string;
}

export const SITE_ORIGIN = "https://baheardle.com";

export const PAGES: Record<Page, PageInfo> = {
  hub: {
    path: "/",
    file: "index.html",
    title: "Blue Archive Heardle - Guess the OST, Voices, Halos and Students",
    description:
      "Daily Blue Archive guessing games: name the OST from a short clip, or a student from a voice line, halo, weapon or clues. Free, with no ads or sign-up.",
  },
  ost: {
    path: "/ost",
    file: "ost.html",
    title: "Guess the Blue Archive OST - Blue Archive Heardle",
    description:
      "Hear a short clip of a Blue Archive song and name it in six tries; each miss plays more. A daily puzzle, endless play, 4-Choice and Time Attack.",
  },
  voice: {
    path: "/voice",
    file: "voice.html",
    title: "Guess the Blue Archive Student by Voice - Blue Archive Heardle",
    description:
      "Hear a student's title call or lobby line and name them, with a hint after each miss: school, club, silhouette. Daily, endless, 4-Choice and Time Attack.",
  },
  students: {
    path: "/students",
    file: "students.html",
    title: "Guess the Blue Archive Student from Clues - Blue Archive Heardle",
    description:
      "Name the Blue Archive student: each guess shows how their school, role, weapon, birthday and more compare. Gameplay or Lore, daily and endless.",
  },
  picture: {
    path: "/picture",
    file: "picture.html",
    title:
      "Guess the Blue Archive Student by Halo or Weapon - Blue Archive Heardle",
    description:
      "Name the Blue Archive student from their halo or weapon, or only its silhouette. A daily puzzle, endless play, 4-Choice and Time Attack.",
  },
};

/** Every page, the hub first, in the order the game switch shows the games. */
export const PAGE_ORDER: Page[] = [
  "hub",
  "ost",
  "voice",
  "picture",
  "students",
];

/** The page's full address, for share texts and the canonical tag. */
export function pageUrl(page: Page): string {
  return SITE_ORIGIN + PAGES[page].path;
}

/**
 * Which page a path is. Anything unknown is the hub: Vercel answers unknown
 * paths with a 404 before the app runs, so this only matters in development.
 */
export function pageOfPath(pathname: string): Page {
  const path = pathname.replace(/\.html$/, "").replace(/\/+$/, "") || "/";
  const found = PAGE_ORDER.find((page) => PAGES[page].path === path);
  return found ?? "hub";
}
