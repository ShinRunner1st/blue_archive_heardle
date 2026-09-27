import { afterEach, describe, expect, it, vi } from "vitest";

import { playOneAtATime } from "./onePlayer";

let stop: () => void = () => undefined;

afterEach(() => {
  stop();
  document.body.innerHTML = "";
});

/** An audio element that says it is playing, with its pause watched. */
function playingAudio() {
  const audio = document.createElement("audio");
  Object.defineProperty(audio, "paused", { value: false, writable: true });
  audio.pause = vi.fn();
  document.body.appendChild(audio);
  return audio;
}

describe("playOneAtATime", () => {
  it("pauses the others when one starts", () => {
    stop = playOneAtATime();
    const first = playingAudio();
    const second = playingAudio();

    second.dispatchEvent(new Event("play"));

    expect(first.pause).toHaveBeenCalled();
    expect(second.pause).not.toHaveBeenCalled();
  });

  it("stops listening when taken off", () => {
    playOneAtATime()();
    const first = playingAudio();
    const second = playingAudio();

    second.dispatchEvent(new Event("play"));

    expect(first.pause).not.toHaveBeenCalled();
  });
});
