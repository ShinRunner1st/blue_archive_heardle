import type { IconType } from "react-icons";
import {
  IoDisc,
  IoKeypad,
  IoMap,
  IoNavigate,
  IoShieldCheckmark,
  IoSparkles,
} from "react-icons/io5";

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
 * The updates, newest first. For a new one, add it at the top: returning
 * players who haven't seen it get the pop-up once, with the previous updates
 * below it (see SHOWN_UPDATES) for anyone who missed them.
 */
export const WHATS_NEW: NewsUpdate[] = [
  {
    id: "2026-09-keyboard",
    name: "Keyboard and privacy",
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
  },
  {
    id: "2026-09",
    name: "Kivotos update",
    items: [
      {
        icon: IoMap,
        title: "Streak places",
        text: "Win in a row and the background travels across Kivotos, somewhere new every 10. Daily and Endless each keep their own journey.",
      },
      {
        icon: IoDisc,
        title: "OST badges",
        text: "Guess every song on one of the eight soundtrack albums to earn its badge. The disc in the header shows how close you are.",
      },
      {
        icon: IoSparkles,
        title: "Characters",
        text: "Arona and Plana, or Mari, keep you company on wide screens and react to your guesses. Pick one in Settings.",
      },
      {
        icon: IoNavigate,
        title: "Blue Archive cursor",
        text: "The game's own cursor, with a flash on every click. You can turn it off in Settings.",
      },
    ],
  },
];

/** How many updates the pop-up shows: the newest and the ones before it. */
export const SHOWN_UPDATES = 3;

/** The newest update's id: what a returning player has or hasn't seen. */
export const LATEST_UPDATE_ID = WHATS_NEW[0].id;
