import type { IconType } from "react-icons";

import newsData from "../content/whats-new.json";
import { iconNamed } from "./icons";

export interface NewsItem {
  icon: IconType;
  title: string;
  text: string;
}

export interface NewsUpdate {
  /** Give each update its own id: a new one is what shows the pop-up again. */
  id: string;
  /** A short heading for the update in the pop-up. */
  name: string;
  items: NewsItem[];
}

/**
 * The updates, newest first, from src/content/whats-new.json. For a new one,
 * add it at the top there, with a new id and icons named from the list in
 * icons.ts: returning players who haven't seen it get the pop-up once, with
 * the previous updates below it (see SHOWN_UPDATES) for anyone who missed
 * them. Only what players would notice goes in (a new game or mode, new
 * students, a change to how something plays), never how the site is built
 * or where its files come from.
 */
export const WHATS_NEW: NewsUpdate[] = newsData.map(({ id, name, items }) => ({
  id,
  name,
  items: items.map(({ icon, title, text }) => ({
    icon: iconNamed(icon),
    title,
    text,
  })),
}));

/** How many updates the pop-up shows: the newest and the ones before it. */
export const SHOWN_UPDATES = 3;

/** The newest update's id: what a returning player has or hasn't seen. */
export const LATEST_UPDATE_ID = WHATS_NEW[0].id;
