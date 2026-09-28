import React, { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createHarness } from "../../test/harness";

import { loadVoiceRounds } from "../../helpers/storage";
import { studentById } from "../../helpers/studentRounds";
import { TIME_ATTACK_MS } from "../../helpers/timeAttack";
import { saveVoiceSettings } from "../../helpers/voiceTimeAttack";
import { RIGHT_PAUSE_MS, WRONG_PAUSE_MS } from "../../hooks/useTimeAttack";
import {
  useVoiceTimeAttack,
  VoiceTimeAttack as State,
} from "../../hooks/useVoiceTimeAttack";
import { VoiceTimeAttack } from "./VoiceTimeAttack";

vi.mock("../../helpers/audioSource", () => ({
  loadAudio: vi.fn((url: string) => Promise.resolve(`blob:${url}`)),
}));

let harness: ReturnType<typeof createHarness>;
let state: State;

function Probe() {
  state = useVoiceTimeAttack();
  return React.createElement(VoiceTimeAttack, {
    timeAttack: state,
    keyboardEnabled: true,
  });
}

function text() {
  return harness.container.textContent ?? "";
}

function click(label: string) {
  const found = Array.from(harness.container.querySelectorAll("button")).find(
    (b) => b.textContent === label
  );
  act(() => found!.click());
}

/** The line finishes loading: the clock starts. */
async function lineLoads() {
  await act(async () => undefined);
  act(() => {
    harness.container
      .querySelector("audio")!
      .dispatchEvent(new Event("loadedmetadata"));
  });
}

function wait(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

function answer(right: boolean) {
  const name = studentById.get(state.run!.current.answer)!.name;
  const buttons = Array.from(
    harness.container.querySelectorAll<HTMLButtonElement>(
      '[aria-label="Answers"] button'
    )
  );
  const pick = buttons.find((b) => b.textContent?.includes(name) === right)!;
  act(() => pick.click());
}

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
  const proto = window.HTMLMediaElement.prototype;
  vi.spyOn(proto, "play").mockImplementation(() => Promise.resolve());
  vi.spyOn(proto, "pause").mockImplementation(() => undefined);
  harness = createHarness();
});

afterEach(() => {
  harness.destroy();
  vi.useRealTimers();
});

describe("Voice time attack", () => {
  it("offers typed or four answers, and remembers the pick", () => {
    harness.render(React.createElement(Probe));
    expect(text()).toContain("Voice Time Attack");

    click("Typed");
    expect(state.settings).toEqual({ answers: "typed" });
  });

  it("plays a run: right and wrong answers, saved as they come", async () => {
    saveVoiceSettings({ answers: "choice" });
    harness.render(React.createElement(Probe));
    click("Start");
    await lineLoads();

    answer(true);
    expect(text()).toContain("✓");
    wait(RIGHT_PAUSE_MS);
    await lineLoads();

    answer(false);
    expect(text()).toContain("It was");
    wait(WRONG_PAUSE_MS);

    expect(state.score).toBe(1);
    expect(loadVoiceRounds("timeattack")).toHaveLength(2);

    // The clock stands still while a line loads, then runs out.
    await lineLoads();
    wait(TIME_ATTACK_MS);
    expect(text()).toContain("Time's up");
    expect(text()).toContain("1 right out of 2");
  });
});
