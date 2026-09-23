import { afterEach, describe, expect, it, vi } from "vitest";

import { getAudioUrl } from "./audioUrl";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getAudioUrl", () => {
  it("serves from the deployed audio folder by default", () => {
    vi.stubEnv("VITE_AUDIO_BASE_URL", "");

    expect(getAudioUrl("10")).toBe("/audio/Theme_10.ogg");
    expect(getAudioUrl("374")).toBe("/audio/Theme_374.ogg");
  });

  it("zero-pads single-digit themes to match the files on disk", () => {
    vi.stubEnv("VITE_AUDIO_BASE_URL", "");

    expect(getAudioUrl("1")).toBe("/audio/Theme_01.ogg");
  });

  it("points at a CDN when one is configured", () => {
    vi.stubEnv("VITE_AUDIO_BASE_URL", "https://audio.example.com");

    expect(getAudioUrl("10")).toBe("https://audio.example.com/Theme_10.ogg");
  });
});
