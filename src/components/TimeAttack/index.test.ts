import React, { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createHarness } from "../../test/harness";

import { loadAudio } from "../../helpers/audioSource";
import { getClipUrl } from "../../helpers/audioUrl";
import { loadRounds } from "../../helpers/storage";
import { saveSettings, TIME_ATTACK_MS } from "../../helpers/timeAttack";
import {
  TimeAttack as TimeAttackState,
  useTimeAttack,
} from "../../hooks/useTimeAttack";
import { TimeAttack } from "./index";

vi.mock("../../helpers/audioSource", () => ({
  loadAudio: vi.fn((url: string) => Promise.resolve(`blob:${url}`)),
}));

let harness: ReturnType<typeof createHarness>;
let state: TimeAttackState;
const onOpenJukebox = vi.fn();

function Probe() {
  state = useTimeAttack();
  return React.createElement(TimeAttack, {
    timeAttack: state,
    keyboardEnabled: true,
    onOpenJukebox,
  });
}

function mount() {
  harness.render(React.createElement(Probe));
}

function text() {
  return harness.container.textContent ?? "";
}

function button(label: string) {
  return Array.from(harness.container.querySelectorAll("button")).find(
    (b) => b.textContent === label || b.getAttribute("aria-label") === label
  );
}

function click(label: string) {
  act(() => button(label)!.click());
}

/** The player's clip finishes loading: the clock starts. */
async function songLoads() {
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

function answers() {
  return Array.from(
    harness.container.querySelectorAll<HTMLButtonElement>(
      '[aria-label="Answers"] button'
    )
  );
}

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
  const proto = window.HTMLMediaElement.prototype;
  vi.spyOn(proto, "play").mockImplementation(() => Promise.resolve());
  vi.spyOn(proto, "pause").mockImplementation(() => undefined);
  vi.spyOn(proto, "load").mockImplementation(() => undefined);
  harness = createHarness();
});

afterEach(() => {
  harness.destroy();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe("TimeAttack's start screen", () => {
  it("offers the settings and says no badges are earned", () => {
    mount();

    expect(text()).toContain("Time Attack");
    expect(text()).toContain("No OST badges are earned in Time Attack");
    expect(button("1s")).toBeDefined();
    expect(button("Random start")?.getAttribute("aria-checked")).toBe("false");
  });

  it("remembers the settings picked", () => {
    mount();

    click("7s");
    click("Typed");
    click("Random start");

    expect(state.settings).toEqual({
      clip: 7,
      answers: "typed",
      randomStart: true,
    });
    expect(JSON.parse(localStorage.getItem("timeAttack")!)).toEqual(
      state.settings
    );
  });
});

describe("a time attack run", () => {
  beforeEach(() => {
    saveSettings({ clip: 2, randomStart: false, answers: "choice" });
  });

  it("loads the first song and the one after it", async () => {
    mount();
    click("Start");
    await act(async () => undefined);

    expect(loadAudio).toHaveBeenCalledWith(
      getClipUrl(state.run!.current.solution.themeNo)
    );
    expect(loadAudio).toHaveBeenCalledWith(
      getClipUrl(state.run!.next.solution.themeNo)
    );
  });

  it("holds the clock until the song has loaded", async () => {
    mount();
    click("Start");
    wait(10_000);

    expect(text()).toContain("3:00");

    await songLoads();
    wait(10_000);

    expect(text()).toContain("2:50");
  });

  it("scores right answers and moves straight on to the next song", async () => {
    mount();
    click("Start");
    await songLoads();
    const first = state.run!.current;

    const right = answers().find((b) =>
      b.textContent?.includes(first.solution.name)
    )!;
    act(() => right.click());

    expect(state.score).toBe(1);
    expect(state.run!.current).not.toBe(first);
    expect(text()).toContain(`✓ ${first.solution.name}`);
    // Saved as soon as it is answered.
    expect(loadRounds("timeattack")).toHaveLength(1);
  });

  it("answers each song once, however quickly it's tapped", async () => {
    mount();
    click("Start");
    await songLoads();
    const first = state.run!.current;

    act(() => {
      state.answer(first, first.solution);
      state.answer(first, first.solution);
    });

    expect(state.run!.rounds).toHaveLength(1);
  });

  it("ends when time is up, with the songs and a way to play again", async () => {
    mount();
    click("Start");
    await songLoads();
    act(() => answers()[0].click());
    await songLoads();

    wait(TIME_ATTACK_MS);

    expect(state.run!.over).toBe(true);
    expect(text()).toContain("Time's up, Sensei!");
    expect(harness.container.querySelectorAll("li")).toHaveLength(1);
    expect(button("Play again")).toBeDefined();

    click("Jukebox");
    expect(onOpenJukebox).toHaveBeenCalled();
  });

  it("goes back to the start screen for new settings", async () => {
    mount();
    click("Start");
    await songLoads();
    act(() => state.finish());

    click("Settings");

    expect(state.run).toBeNull();
    expect(button("Start")).toBeDefined();
  });

  it("keeps finished runs across a reload, but not the run itself", async () => {
    mount();
    click("Start");
    await songLoads();
    act(() => answers()[0].click());

    harness.unmount();
    mount();

    expect(state.run).toBeNull();
    expect(state.stats.runs).toBe(1);
  });
});

describe("a typed time attack run", () => {
  beforeEach(() => {
    saveSettings({ clip: 1, randomStart: false, answers: "typed" });
  });

  it("passes with Shift+Enter, counting it as missed", async () => {
    mount();
    click("Start");
    await songLoads();

    act(() => {
      window.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Enter", shiftKey: true })
      );
    });

    expect(state.run!.rounds).toHaveLength(1);
    expect(state.run!.rounds[0].didGuess).toBe(false);
    expect(text()).toContain("Passed:");
  });
});
