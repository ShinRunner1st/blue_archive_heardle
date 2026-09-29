/**
 * Fills in the link preview (preview.html) from the game's own data, so the
 * numbers on it match the game whenever it is drawn again, and sets
 * `window.previewReady` once Arona is on screen for the screenshot.
 */
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { IoMic, IoMusicalNotes, IoPeople, IoSparkles } from "react-icons/io5";

import { spineCharacters } from "../../src/constants/characters";
import { PICTURE_SHEETS } from "../../src/constants/guessSheets";
import { songs } from "../../src/constants/songs";
import { students } from "../../src/constants/students";
import { answerOf, pictureAnswers } from "../../src/helpers/pictureRounds";
import { createStage } from "../../src/helpers/spineStage";
import { lineCount, voicePool } from "../../src/helpers/voiceRounds";

declare global {
  interface Window {
    previewReady?: boolean;
  }
}

const number = (n: number) => n.toLocaleString("en-US");

const lines = voicePool.reduce((sum, { id }) => sum + lineCount(id), 0);
const counts: Record<string, string> = {
  songs: `${number(songs.length)} songs`,
  lines: `${number(lines)} voice lines`,
  students: `${number(students.length)} students`,
  pictures: `${pictureAnswers("halo").length} halos, ${
    pictureAnswers("weapon").length
  } weapons`,
};
document.querySelectorAll<HTMLElement>("[data-count]").forEach((el) => {
  el.textContent = counts[el.dataset.count!];
});

const icons = {
  music: IoMusicalNotes,
  mic: IoMic,
  people: IoPeople,
  sparkles: IoSparkles,
};
document.querySelectorAll<HTMLElement>("[data-icon]").forEach((el) => {
  const icon = icons[el.dataset.icon as keyof typeof icons];
  el.innerHTML = renderToStaticMarkup(createElement(icon));
});

/**
 * Halos of some of the best-known students, where they float and how big,
 * in pixels on the preview.
 */
const HALOS: Array<[name: string, x: number, y: number, size: number]> = [
  ["Hoshino", 806, 40, 96],
  ["Shiroko", 1086, 36, 92],
  ["Mika", 1090, 330, 84],
];

const sheet = PICTURE_SHEETS.halo;
const halos = document.querySelector(".halos")!;
for (const [name, x, y, size] of HALOS) {
  const student = students.find((s) => s.name === name);
  const answer = student && answerOf("halo", student.id);
  if (!answer) throw new Error(`No halo for ${name}`);
  const scale = size / sheet.cellWidth;
  const column = answer.picture % sheet.columns;
  const row = Math.floor(answer.picture / sheet.columns);
  const el = document.createElement("div");
  Object.assign(el.style, {
    left: `${x}px`,
    top: `${y}px`,
    width: `${size}px`,
    height: `${size}px`,
    backgroundImage: "url(/pictures/guess/halos.webp)",
    backgroundSize: `${sheet.columns * sheet.cellWidth * scale}px auto`,
    backgroundPosition: `${-column * sheet.cellWidth * scale}px ${
      -row * sheet.cellHeight * scale
    }px`,
  });
  halos.append(el);
}

const canvas = document.querySelector<HTMLCanvasElement>(".arona canvas")!;
const stage = createStage(canvas);
stage.onReady(() => {
  // A few frames for the expression to settle before the screenshot.
  setTimeout(() => (window.previewReady = true), 800);
});
stage.setExpression("21");
stage.show(spineCharacters.arona);
