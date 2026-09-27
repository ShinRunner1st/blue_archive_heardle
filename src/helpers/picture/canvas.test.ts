import { describe, expect, it } from "vitest";

import { fakeContext } from "../../test/fakeCanvas";
import { drawPlayerName, withoutEmoji } from "./canvas";

describe("withoutEmoji", () => {
  it("drops emoji but keeps the star and the ellipsis", () => {
    expect(withoutEmoji("3★ clear on the first try! ✨")).toBe(
      "3★ clear on the first try!"
    );
    expect(withoutEmoji("Cleared at the last second! 😭💥")).toBe(
      "Cleared at the last second!"
    );
    expect(withoutEmoji("Tactical retreat, Sensei… 💔")).toBe(
      "Tactical retreat, Sensei…"
    );
  });
});

describe("drawPlayerName", () => {
  it("draws the name as a Sensei, once", () => {
    const { ctx, texts } = fakeContext();

    drawPlayerName(ctx, "  Hoshino ");
    drawPlayerName(ctx, "Sensei Yuuka");

    expect(texts).toEqual(["Sensei Hoshino", "Sensei Yuuka"]);
  });

  it("draws nothing without a name", () => {
    const { ctx, texts } = fakeContext();

    drawPlayerName(ctx, "   ");

    expect(texts).toEqual([]);
  });
});
