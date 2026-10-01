import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { stopPictureDrags } from "./noPictureDrag";

const drag = (element: Element) => {
  const event = new Event("dragstart", { bubbles: true, cancelable: true });
  element.dispatchEvent(event);
  return event.defaultPrevented;
};

describe("stopPictureDrags", () => {
  let undo: () => void;

  beforeEach(() => {
    undo = stopPictureDrags();
    document.body.innerHTML = `
      <img id="cover" src="cover.webp" alt="" />
      <a id="card" href="/ost"><img src="ost.webp" alt="" /><span id="words">OST</span></a>
      <a id="text" href="/about">About</a>`;
  });

  afterEach(() => {
    undo();
    document.body.innerHTML = "";
  });

  it("stops a picture, and a link with one in it", () => {
    expect(drag(document.getElementById("cover")!)).toBe(true);
    expect(drag(document.getElementById("card")!)).toBe(true);
    expect(drag(document.getElementById("words")!)).toBe(true);
  });

  it("leaves a link of words alone", () => {
    expect(drag(document.getElementById("text")!)).toBe(false);
  });

  it("stops nothing once undone", () => {
    undo();
    expect(drag(document.getElementById("cover")!)).toBe(false);
    undo = () => {};
  });
});
