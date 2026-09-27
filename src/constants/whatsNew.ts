import type { IconType } from "react-icons";
import {
  IoGrid,
  IoPerson,
  IoImage,
  IoRadio,
  IoStopwatch,
  IoCalendar,
  IoDisc,
  IoKeypad,
  IoMap,
  IoMusicalNotes,
  IoNavigate,
  IoSave,
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
    id: "2026-09-ost-modes",
    name: "New ways to play the OST",
    items: [
      {
        icon: IoGrid,
        title: "4-Choice",
        text: "In Endless, switch to 4-Choice: hear a short clip, 1 to 7 seconds as you like, then pick the song from four that sound alike. It has its own stats and streak.",
      },
      {
        icon: IoStopwatch,
        title: "Time Attack",
        text: "Name as many songs as you can in three minutes. Pick the clip length, a random start, and typed or four-choice answers. A miss costs two seconds. Beat your best in Stats, and share a recap.",
      },
      {
        icon: IoRadio,
        title: "Jukebox",
        text: "Open the Jukebox from the ☰ menu to play any song in full. Search it or pick OST albums; the songs you've guessed stand out. Turn on Auto next to keep the music going.",
      },
      {
        icon: IoPerson,
        title: "Your name on pictures",
        text: "Add a player name in Settings and your shared pictures say Sensei and your name. It stays on your device.",
      },
    ],
  },
  {
    id: "2026-09-save-file",
    name: "Share, save and look back",
    items: [
      {
        icon: IoImage,
        title: "Share a picture",
        text: "Share picture on the result screen makes a picture of your round for X, and Share recap in Stats sums up your record. Daily pictures never show the song.",
      },
      {
        icon: IoSave,
        title: "Take your progress with you",
        text: "Export your progress in every mode to a file in Settings, then import it on another device or browser to carry on there.",
      },
      {
        icon: IoMusicalNotes,
        title: "Your record with each song",
        text: "The result screen now shows how often you've heard the song, how many times you guessed it and your best number of tries.",
      },
      {
        icon: IoCalendar,
        title: "Daily calendar",
        text: "Daily stats now have a calendar of every puzzle, coloured by how it went. No song names, so it's safe to show off.",
      },
    ],
  },
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
