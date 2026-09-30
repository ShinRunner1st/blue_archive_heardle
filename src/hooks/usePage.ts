import React from "react";

import { Page, PAGES, pageOfPath, pageUrl } from "../constants/pages";

/**
 * Names the tab and updates the tags a reload would bring, for a page the
 * player moved to without one. The built page already has them, so this is
 * for the tab's title, and for anything that reads the tags later.
 */
function describeDocument(page: Page) {
  const info = PAGES[page];
  document.title = info.title;
  document
    .querySelector('meta[name="description"]')
    ?.setAttribute("content", info.description);
  document
    .querySelector('link[rel="canonical"]')
    ?.setAttribute("href", pageUrl(page));
}

/** Marks the history entries that hold a player on the page (see guardHistory). */
const GUARD = { guard: true };

/** The address guardHistory holds the player at, the room's in it. */
let held: string | null = null;

const isGuard = (state: unknown) =>
  typeof state === "object" && state !== null && "guard" in state;

/**
 * Puts a copy of this entry on top of the history, so a stray Back lands on
 * the same page, where usePage's lock turns it back, rather than leaving it.
 * Browsers skip entries a page adds without a click, so a second Back can
 * still go: this stops a slip, not a player who means it.
 */
export function guardHistory(): void {
  held = window.location.href;
  if (!isGuard(window.history.state)) {
    window.history.pushState(GUARD, "", window.location.href);
  }
}

/** Takes guardHistory's copy off again, the address as it is now. */
export function unguardHistory(): void {
  held = null;
  if (!isGuard(window.history.state)) return;
  const address = window.location.href;
  window.addEventListener(
    "popstate",
    () => window.history.replaceState(null, "", address),
    { once: true }
  );
  window.history.back();
}

/**
 * The page being shown, the hub or a game, from the address bar. Moving to
 * another swaps it in place, with no reload: no new request, and the music
 * and the characters carry on. Back and Forward move between them too.
 *
 * While `lock` holds a function (a player in a multiplayer room), nothing
 * moves to another page: a link, Back or Forward calls it instead, and the
 * page stays.
 */
export function usePage(
  lock?: React.RefObject<(() => void) | null>
): [Page, (page: Page) => void] {
  const [page, setPage] = React.useState<Page>(() =>
    pageOfPath(window.location.pathname)
  );
  const shown = React.useRef(page);
  React.useEffect(() => {
    shown.current = page;
  }, [page]);

  React.useEffect(() => {
    const onPopState = () => {
      const stay = lock?.current;
      if (stay) {
        // Back where it was, held again.
        window.history.pushState(
          GUARD,
          "",
          held ?? PAGES[shown.current].path + window.location.search
        );
        stay();
        return;
      }
      setPage(pageOfPath(window.location.pathname));
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [lock]);

  React.useEffect(() => describeDocument(page), [page]);

  const navigate = React.useCallback(
    (next: Page) => {
      const stay = lock?.current;
      if (stay && next !== shown.current) {
        stay();
        return;
      }
      if (pageOfPath(window.location.pathname) !== next) {
        // The query stays: it carries the dev previews, ?season= and
        // ?birthday=.
        window.history.pushState(
          null,
          "",
          PAGES[next].path + window.location.search
        );
      }
      setPage(next);
    },
    [lock]
  );

  return [page, navigate];
}

/**
 * A plain left click on a link to one of the site's pages: the page swaps in
 * place. A click with a modifier key, or the middle button, is left to the
 * browser, which opens the page in a new tab or window.
 */
export function isPlainClick(event: React.MouseEvent): boolean {
  return (
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey
  );
}
