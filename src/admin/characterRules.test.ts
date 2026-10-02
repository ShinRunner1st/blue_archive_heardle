import { describe, expect, it } from "vitest";

import { characterProblem } from "./characterRules";

describe("characterProblem", () => {
  const files = [
    { name: "kei_spr.skel", data: "" },
    { name: "kei_spr.atlas", data: "" },
    { name: "kei_spr.png", data: "" },
  ];

  it("takes a cached sprite or her three files", () => {
    expect(characterProblem({ id: "hinata", sprite: "hinata" })).toBeNull();
    expect(characterProblem({ id: "kei", upload: files })).toBeNull();
  });

  it("refuses odd ids, settings' names, odd sprites and missing files", () => {
    expect(characterProblem({ id: "../x", sprite: "hina" })).not.toBeNull();
    expect(characterProblem({ id: "auto", sprite: "hina" })).not.toBeNull();
    expect(characterProblem({ id: "hina", sprite: "../hina" })).not.toBeNull();
    expect(
      characterProblem({ id: "kei", upload: files.slice(0, 2) })
    ).not.toBeNull();
    expect(
      characterProblem({
        id: "kei",
        upload: [...files.slice(0, 2), { name: "../x.png", data: "" }],
      })
    ).not.toBeNull();
  });
});
