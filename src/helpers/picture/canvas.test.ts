import { describe, expect, it } from "vitest";

import { withoutEmoji } from "./canvas";

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
