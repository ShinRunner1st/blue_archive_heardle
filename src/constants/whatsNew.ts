import type { IconType } from "react-icons";
import { IoKeypad, IoShieldCheckmark } from "react-icons/io5";

export interface NewsItem {
  icon: IconType;
  title: string;
  text: string;
}

/**
 * The latest additions, shown once to returning players. Give `id` a new value
 * with each batch, and everyone who saw the last one gets the pop-up again.
 */
export const WHATS_NEW: { id: string; items: NewsItem[] } = {
  id: "2026-09-keyboard",
  items: [
    {
      icon: IoKeypad,
      title: "Play without the mouse",
      text: "Just start typing to search. Space plays the clip, Enter guesses and moves on, and Shift+Enter skips.",
    },
    {
      icon: IoShieldCheckmark,
      title: "Your privacy",
      text: "No accounts, cookies, ads or analytics. Your progress stays in this browser. More in About this game.",
    },
  ],
};
