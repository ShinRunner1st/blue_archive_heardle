import type { IconType } from "react-icons";
import {
  IoGrid,
  IoPerson,
  IoImage,
  IoRadio,
  IoStopwatch,
  IoCalendar,
  IoDisc,
  IoEarth,
  IoGameController,
  IoGift,
  IoHome,
  IoIdCard,
  IoPeople,
  IoSchool,
  IoKeypad,
  IoMap,
  IoMic,
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
 * below it (see SHOWN_UPDATES) for anyone who missed them. Only what players
 * would notice goes in (a new game or mode, new students, a change to how
 * something plays), never how the site is built or where its files come
 * from.
 */
export const WHATS_NEW: NewsUpdate[] = [
  {
    id: "2026-10-multiplayer",
    name: "Multiplayer",
    items: [
      {
        icon: IoGameController,
        title: "Play with friends",
        text: "Make a private room and share its code: up to 8 players play the OST, Voice or Picture game together, everyone hearing the same song at once, as in Anime Music Quiz. Send an answer (Quick answer sends your first pick at once) and change your mind as often as you like until the time's up; everyone sees when each player's latest answer went. The fastest right answers break a tie. The host picks the game, answers, rounds, time and the room's server, can save them as presets to share with friends, can give the room a password or lock it, and can kick a player; ending a game early needs most of the room to agree.",
      },
    ],
  },
  {
    id: "2026-09-game-files",
    name: "New on JP",
    items: [
      {
        icon: IoMic,
        title: "Anna and Erina",
        text: "On the JP server, Anna and Erina now have voice lines in Voice and halos in Picture. Their lines' text is Japanese until the English version is out.",
      },
    ],
  },
  {
    id: "2026-09-picture",
    name: "Halos, weapons and a home page",
    items: [
      {
        icon: IoHome,
        title: "A home page",
        text: "baheardle.com now opens on every game at once, with how today's daily puzzles went, a button to carry on where you left off, your record, what's on in Global (or JP) right now: pickups, event and raids and this week's birthdays. Each game has its own page to bookmark or share (baheardle.com/voice, say); the bar under the header moves between them, and the logo brings you home.",
      },
      {
        icon: IoEarth,
        title: "JP server",
        text: "Students, Voice and Picture can follow the JP server, with the students Global doesn't have yet. Pick Global or JP on the home page or in Settings; each keeps its own daily puzzles, rounds and stats.",
      },
      {
        icon: IoMusicalNotes,
        title: "Jukebox on every page",
        text: "The Jukebox now plays on after you close it in every game, until a clip or a voice line starts. Resetting a mode's stats has moved from About to Settings, where it names the game and mode it clears.",
      },
      {
        icon: IoSparkles,
        title: "Picture",
        text: "A new game, beside Voice: see a halo or a weapon and name its student. Halo or Weapon sits above the game. Costumes share a halo and most share a gun, so naming any student it belongs to is right.",
      },
      {
        icon: IoGrid,
        title: "Every way to play",
        text: "A daily halo and a daily weapon, each with its own streak and calendar, and in Endless: Classic, with four tries and a hint after each miss (school, club, then their silhouette) or no hints; 4-Choice; and Time Attack. Turn Silhouette on in any of them to see only the picture's shape. Share pictures and recaps too.",
      },
    ],
  },
  {
    id: "2026-09-voice",
    name: "Guess the voice",
    items: [
      {
        icon: IoMic,
        title: "Voice",
        text: "A third game beside the OST and Students: hear a student's line, their title call or one from the lobby, and name them. You get four tries, and each miss shows a hint: their school, then their club, then their silhouette. Every costume is its own answer.",
      },
      {
        icon: IoGrid,
        title: "Every way to play",
        text: "Voice has a daily puzzle with its own streak and calendar, and in Endless: Classic (hints on or off, each with its own stats), 4-Choice (four voices that sound alike) and Time Attack, with every line or title calls only. The result plays the line again and shows what the student said, in English. Share a picture of your round or run, or a recap from Stats.",
      },
      {
        icon: IoPeople,
        title: "Pick, then guess",
        text: "In Voice and Students, picking a name from the list or the grid puts it in the search box; press Enter or Guess to send it, as in the OST. Students has a Random first guess to get you started, and its clock now starts with your first guess, not your first letter.",
      },
    ],
  },
  {
    id: "2026-09-solve-time",
    name: "Time your finds",
    items: [
      {
        icon: IoStopwatch,
        title: "Solve time",
        text: "In Students, a clock starts when you type your first letter and stops when you find the student. Your time shows on the result, the share text and the share picture, and Stats keeps your fastest and average find. Guesses still come first.",
      },
    ],
  },
  {
    id: "2026-09-students",
    name: "Guess the student",
    items: [
      {
        icon: IoPeople,
        title: "Students",
        text: "Switch to Students under the header to guess a Blue Archive student. Each guess shows how its school, role, birthday and more compare with the answer's, with arrows for higher or lower. Daily and Endless, each with its own stats and streak.",
      },
      {
        icon: IoSchool,
        title: "Gameplay and Lore",
        text: "Gameplay compares kits: school, role, damage and defense type, weapon, EX cost and release, and every costume is its own answer. Lore compares profiles: height, birthday, school year, club, favourite gift and more. Share a picture of your round, or a recap from Stats.",
      },
      {
        icon: IoIdCard,
        title: "Sensei card",
        text: "Open Sensei card from the ☰ menu for your record across every mode on a Schale licence, with your favourite student's portrait. Share it or download it.",
      },
      {
        icon: IoGift,
        title: "Birthdays",
        text: "On a student's birthday, a note at the top of the page wishes them a happy one.",
      },
      {
        icon: IoMusicalNotes,
        title: "Music while you guess",
        text: "In Students, the Jukebox plays on after you close it, with a small player in the corner. It shows each song's OST album cover, and songs you've played start at once next time. The OST badges have moved into the ☰ menu.",
      },
    ],
  },
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
        text: "Open the Jukebox from the ☰ menu to play any song in full. Search it or pick OST albums; the songs you've guessed stand out. The repeat button plays on to the next song, or loops the one you love.",
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
        text: "Guess every song on one of the eight soundtrack albums to earn its badge. OST badges in the ☰ menu show how close you are.",
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
