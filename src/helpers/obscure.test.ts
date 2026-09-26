import { describe, expect, it } from "vitest";

import { obscure, reveal } from "./obscure";

describe("obscure", () => {
  it("hides the text, and reveal brings it back", () => {
    const text = '[{"name":"Constant Moderato","themeNo":"1"}]';
    const hidden = obscure(text);

    expect(hidden).not.toContain("Constant");
    expect(reveal(hidden)).toBe(text);
  });

  it("keeps non-ASCII text intact", () => {
    expect(reveal(obscure("トモダチ Summer ~"))).toBe("トモダチ Summer ~");
  });

  it("returns null for anything it didn't produce", () => {
    expect(reveal("%%% not base64")).toBeNull();
  });
});
