/**
 * Draws the link preview's icons and sparks (preview.html) and Mari, in her
 * idol dress, and sets `window.previewReady` once she is on screen for the
 * screenshot.
 */
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { IoMic, IoMusicalNotes, IoPeople, IoSparkles } from "react-icons/io5";

import { spineCharacters } from "../../src/constants/characters";
import { createStage } from "../../src/helpers/spineStage";

declare global {
  interface Window {
    previewReady?: boolean;
  }
}

/** The game switch's own icons. */
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
