import { describe, expect, it } from "vitest";

import { fakeContext } from "../../test/fakeCanvas";
import { pictureName } from "../playerName";
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
  it("draws the name as pictureName gives it", () => {
    const { ctx, texts } = fakeContext();

    drawPlayerName(ctx, pictureName("  Hoshino ", true));
    drawPlayerName(ctx, pictureName("Sensei Yuuka", true));
    drawPlayerName(ctx, pictureName("Aris", false));

    expect(texts).toEqual(["Sensei Hoshino", "Sensei Yuuka", "Aris"]);
  });

  it("draws nothing without a name", () => {
    const { ctx, texts } = fakeContext();

    drawPlayerName(ctx, pictureName("   ", true));

    expect(texts).toEqual([]);
  });
});
