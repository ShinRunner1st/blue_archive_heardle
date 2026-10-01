/**
 * Draws a page's link preview (preview.html?page=<page>): its words and
 * cards, the game switch's icons, the sparks and Mari, in her idol dress,
 * and sets `window.previewReady` once she is on screen for the screenshot.
 */
import { createElement } from "react";
import { IconType } from "react-icons";
import { renderToStaticMarkup } from "react-dom/server";
import {
  IoCalendar,
  IoDice,
  IoEyeOff,
  IoGameController,
  IoGrid,
  IoKey,
  IoLibrary,
  IoMic,
  IoMusicalNotes,
  IoPeople,
  IoPersonAdd,
  IoSparkles,
  IoStopwatch,
} from "react-icons/io5";

import { spineCharacters } from "../../src/constants/characters";
import { Page, PAGES } from "../../src/constants/pages";
import { createStage } from "../../src/helpers/spineStage";

declare global {
  interface Window {
    previewReady?: boolean;
  }
}

interface Card {
  icon: IconType;
  name: string;
  line: string;
  /** Across both columns, for the odd one out. */
  wide?: boolean;
}

interface Preview {
  tagline: string;
  cards: Card[];
  chips: string[];
}

/** The game switch's icons, as the hub's cards and the game bar have them. */
const GAMES: Record<"ost" | "voice" | "picture" | "students", Card> = {
  ost: { icon: IoMusicalNotes, name: "OST", line: "Name the song from a clip" },
  voice: { icon: IoMic, name: "Voice", line: "Who is speaking?" },
  picture: { icon: IoSparkles, name: "Halo & Weapon", line: "Whose is it?" },
  students: { icon: IoPeople, name: "Students", line: "Find them from clues" },
};

/** The ways to play the OST, Voice and Picture share. */
const MODES = (classic: string, choice: string): Card[] => [
  { icon: IoCalendar, name: "Daily", line: "Same for everyone" },
  { icon: IoDice, name: "Classic", line: classic },
  { icon: IoGrid, name: "4-Choice", line: choice },
  {
    icon: IoStopwatch,
    name: "Time Attack",
    line: "Race a 3-minute clock",
  },
];

const PREVIEWS: Record<Page, Preview> = {
  hub: {
    tagline: "Guess the OST, and students by voice, halo, weapon or clues.",
    cards: [
      GAMES.ost,
      GAMES.voice,
      GAMES.picture,
      GAMES.students,
      {
        icon: IoGameController,
        name: "Multiplayer",
        line: "Private rooms: play any of them with friends",
        wide: true,
      },
    ],
    chips: ["Daily puzzle", "Endless", "Time Attack", "Free, no ads"],
  },
  ost: {
    tagline:
      "Name the Blue Archive song from a short clip. Each miss plays more.",
    cards: MODES("Six tries, endless songs", "Pick it from four"),
    chips: ["Every OST", "Jukebox", "Free, no ads"],
  },
  voice: {
    tagline: "Hear a student's line and name who is speaking.",
    cards: MODES("A hint after each miss", "Four that sound alike"),
    chips: ["Title calls", "Lobby lines", "Global or JP", "Free, no ads"],
  },
  picture: {
    tagline: "Name the student from their halo or weapon, or only its shape.",
    cards: MODES("Hints, or none at all", "Pick from four"),
    chips: ["Halos", "Weapons", "Silhouettes", "Global or JP"],
  },
  students: {
    tagline: "Find the student: every guess shows how close you are.",
    cards: [
      { icon: IoCalendar, name: "Daily", line: "One student for everyone" },
      { icon: IoDice, name: "Endless", line: "As many as you like" },
      {
        icon: IoSparkles,
        name: "Gameplay",
        line: "Role, weapon, EX cost",
      },
      { icon: IoLibrary, name: "Lore", line: "Birthday, club, gift" },
    ],
    chips: ["No guess limit", "Solve clock", "Global or JP", "Free, no ads"],
  },
  multiplayer: {
    tagline: "Play with friends: everyone hears the same song at once.",
    cards: [
      { icon: IoKey, name: "Private rooms", line: "Share a code or a link" },
      {
        icon: IoPersonAdd,
        name: "2 to 8 players",
        line: "Fastest right answer wins",
      },
      {
        icon: IoMusicalNotes,
        name: "Any game",
        line: "OST, Voice or Picture",
      },
      { icon: IoEyeOff, name: "No sign-up", line: "Nothing is kept" },
    ],
    chips: ["Free", "No ads", "No accounts"],
  },
};

const page = (new URLSearchParams(location.search).get("page") ??
  "hub") as Page;
const preview = PREVIEWS[page];
if (!preview) throw new Error(`No preview for ${page}`);

const card = document.querySelector<HTMLElement>(".card")!;
card.dataset.page = page;
document.querySelector(".tagline")!.textContent = preview.tagline;
document.querySelector(".site")!.textContent =
  "baheardle.com" + (PAGES[page].path === "/" ? "" : PAGES[page].path);

const list = document.querySelector(".games")!;
for (const { icon, name, line, wide } of preview.cards) {
  const item = document.createElement("li");
  if (wide) item.className = "wide";
  item.innerHTML =
    `<span class="icon">${renderToStaticMarkup(createElement(icon))}</span>` +
    `<b></b><span></span>`;
  item.querySelector("b")!.textContent = name;
  item.querySelector("span:last-child")!.textContent = line;
  list.append(item);
}

const footer = document.querySelector(".footer")!;
for (const chip of preview.chips) {
  const el = document.createElement("span");
  el.textContent = chip;
  footer.append(el);
}

/** Gold sparks round her, as stage lights catch: where and how big. */
const SPARKS: Array<[x: number, y: number, size: number]> = [
  [820, 70, 34],
  [1110, 110, 44],
  [1150, 250, 22],
  [790, 330, 24],
  [1120, 420, 30],
  [850, 520, 20],
];

const sparks = document.querySelector(".sparks")!;
for (const [x, y, size] of SPARKS) {
  const el = document.createElement("div");
  el.innerHTML = `<svg viewBox="0 0 100 100"><path d="M50 0 L61 39 L100 50 L61 61 L50 100 L39 61 L0 50 L39 39 Z" /></svg>`;
  Object.assign(el.style, {
    left: `${x}px`,
    top: `${y}px`,
    width: `${size}px`,
    height: `${size}px`,
  });
  sparks.append(el);
}

const canvas = document.querySelector<HTMLCanvasElement>(".character canvas")!;
const stage = createStage(canvas);
stage.onReady(() => {
  // A few frames for the expression to settle before the screenshot.
  setTimeout(() => (window.previewReady = true), 800);
});
stage.setExpression("03");
stage.show(spineCharacters.mari);
