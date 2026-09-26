import { describe, expect, it, vi } from "vitest";

import { VOLUMES } from "../constants/volumes";

describe("preloadCovers", () => {
  it("fetches every cover, only the first time", async () => {
    const sources: string[] = [];
    vi.stubGlobal(
      "Image",
      class {
        decoding = "";
        set src(value: string) {
          sources.push(value);
        }
      }
    );
    const { preloadCovers } = await import("./preloadCovers");

    preloadCovers();
    preloadCovers();

    expect(sources).toEqual(VOLUMES.map((volume) => volume.cover));
    vi.unstubAllGlobals();
  });
});
