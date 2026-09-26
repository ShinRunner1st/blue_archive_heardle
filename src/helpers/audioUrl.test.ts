import { afterEach, describe, expect, it, vi } from "vitest";

import { songs } from "../constants";
import { audioClips } from "../constants/audioClips";
import { playTimes } from "../constants/playTimes";
import { CLIP_SECONDS, clipFile, songFile } from "./audioFiles";
import { clipInfo, getClipUrl, getSongUrl } from "./audioUrl";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("audio URLs", () => {
  it("serves from the deployed audio folder by default", () => {
    vi.stubEnv("VITE_AUDIO_BASE_URL", "");

    const { v } = clipInfo("10");
    expect(getClipUrl("10")).toBe(`/audio/${clipFile("10", v)}`);
    expect(getSongUrl("10")).toBe(`/audio/${songFile("10", v)}`);
  });

  it("points at a CDN when one is configured", () => {
    vi.stubEnv("VITE_AUDIO_BASE_URL", "https://audio.example.com");

    expect(getClipUrl("10")).toBe(
      `https://audio.example.com/${clipFile("10", clipInfo("10").v)}`
    );
  });

  it("names no file after its song", () => {
    vi.stubEnv("VITE_AUDIO_BASE_URL", "");

    for (const url of [getClipUrl("7"), getSongUrl("7")]) {
      expect(url).not.toMatch(/Theme|0?7\.ogg/);
    }
  });

  it("renames a song's files when its audio changes", () => {
    expect(clipFile("10", "aaaa")).not.toBe(clipFile("10", "bbbb"));
    expect(songFile("10", "aaaa")).not.toBe(songFile("10", "bbbb"));
  });

  it("gives every clip and song a name of its own", () => {
    const names = songs.flatMap((song) => [
      getClipUrl(song.themeNo),
      getSongUrl(song.themeNo),
    ]);

    expect(new Set(names).size).toBe(songs.length * 2);
  });
});

describe("clips", () => {
  it("are as long as the longest try", () => {
    expect(CLIP_SECONDS).toBe(playTimes[playTimes.length - 1] / 1000);
  });

  // Fails when the song list changed without `npm run build:audio`.
  it("are built for exactly the songs in the list", () => {
    expect(Object.keys(audioClips).sort()).toEqual(
      songs.map((song) => song.themeNo).sort()
    );
  });

  it("fit inside their song", () => {
    for (const song of songs) {
      const { start, duration } = clipInfo(song.themeNo);
      expect(start).toBeGreaterThanOrEqual(0);
      expect(start + CLIP_SECONDS).toBeLessThanOrEqual(
        Math.max(duration, CLIP_SECONDS) + 0.01
      );
    }
  });
});
