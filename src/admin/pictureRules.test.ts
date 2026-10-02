import { describe, expect, it } from "vitest";

import { pictureTargetProblem, VIEWABLE_PICTURE } from "./pictureRules";

describe("pictureTargetProblem", () => {
  const png = "data:image/png;base64,iVBORw0KGgo=";

  it("takes a scene, a season's backdrop and a cover where they belong", () => {
    expect(
      pictureTargetProblem({
        target: "pictures/scenes/rooftop.webp",
        style: "scene",
        upload: png,
      })
    ).toBeNull();
    expect(
      pictureTargetProblem({
        target: "pictures/seasons/rainy-night.webp",
        style: "backdrop-night",
        background: "FireplaceDormitory_Night",
      })
    ).toBeNull();
    expect(
      pictureTargetProblem({
        target: "src/image/badges/vol9.webp",
        style: "cover",
        upload: png,
      })
    ).toBeNull();
  });

  it("refuses other places, other files and odd names", () => {
    for (const target of [
      "pictures/hub/ost.webp",
      "pictures/scenes/../../package.json",
      "pictures/scenes/Big Name.webp",
      "src/image/badges/vol9.webp",
    ]) {
      expect(
        pictureTargetProblem({ target, style: "scene", upload: png })
      ).not.toBeNull();
    }
    expect(
      pictureTargetProblem({
        target: "pictures/scenes/a.webp",
        style: "scene",
        upload: "data:text/html;base64,PGh0bWw+",
      })
    ).not.toBeNull();
    expect(
      pictureTargetProblem({
        target: "pictures/scenes/a.webp",
        style: "scene",
        background: "../secret; rm",
      })
    ).not.toBeNull();
  });

  it("shows only the Worker's pictures and the covers", () => {
    expect(VIEWABLE_PICTURE.test("pictures/seasons/beach-day.webp")).toBe(true);
    expect(VIEWABLE_PICTURE.test("src/image/badges/vol1.webp")).toBe(true);
    expect(VIEWABLE_PICTURE.test("../package.json")).toBe(false);
    expect(VIEWABLE_PICTURE.test("pictures/../.env.production")).toBe(false);
  });
});
