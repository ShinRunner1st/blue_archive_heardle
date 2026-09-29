import type { IconType } from "react-icons";
import { IoImage, IoMic } from "react-icons/io5";

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
 * The newest update, the only one the pop-up shows. For a new one, replace
 * it, with a new id: returning players who haven't seen it get the pop-up
 * once. Earlier updates are deleted, not kept below it.
 */
export const WHATS_NEW: NewsUpdate = {
  id: "2026-09-game-files",
  name: "Straight from the game",
  items: [
    {
      icon: IoImage,
      title: "The game's own pictures",
      text: "Student icons, Sensei card portraits and weapons now come from Blue Archive's own files, in their current art, and new students arrive with the game's updates.",
    },
    {
      icon: IoMic,
      title: "Anna and Erina",
      text: "On the JP server, Anna and Erina now have voice lines in Voice and halos in Picture. Their lines' text is Japanese until the English version is out.",
    },
  ],
};

/** The newest update's id: what a returning player has or hasn't seen. */
export const LATEST_UPDATE_ID = WHATS_NEW.id;
