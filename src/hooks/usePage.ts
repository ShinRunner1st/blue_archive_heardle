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

/**
 * The page being shown, the hub or a game, from the address bar. Moving to
 * another swaps it in place, with no reload: no new request, and the music
 * and the characters carry on. Back and Forward move between them too.
 */
export function usePage(): [Page, (page: Page) => void] {
  const [page, setPage] = React.useState<Page>(() =>
    pageOfPath(window.location.pathname)
  );

  React.useEffect(() => {
    const onPopState = () => setPage(pageOfPath(window.location.pathname));
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  React.useEffect(() => describeDocument(page), [page]);

  const navigate = React.useCallback((next: Page) => {
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
  }, []);

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
