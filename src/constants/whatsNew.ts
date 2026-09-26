import type { IconType } from "react-icons";
import { IoDisc, IoMap, IoNavigate, IoSparkles } from "react-icons/io5";

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
  id: "2026-09",
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
};
