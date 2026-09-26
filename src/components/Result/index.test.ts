import React, { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createHarness } from "../../test/harness";

import { Song } from "../../types/song";
import { Round } from "../../types/stats";
import { emptyGuesses } from "../../helpers/storage";

import { Result } from "./index";

const solution: Song = {
  artist: "Mitsukiyo",
  name: "Constant Moderato",
  themeNo: "1",
};

/** A round won on the second try, after one wrong guess. */
function wonRound(day?: number): Round {
  const guesses = emptyGuesses();
  guesses[0] = { song: solution, skipped: false, isCorrect: false };
  guesses[1] = { song: solution, skipped: false, isCorrect: true };

  return {
    solution,
    currentTry: 2,
    didGuess: true,
    guesses,
    startTime: 12,
    ...(day === undefined ? {} : { day }),
  };
}

let harness: ReturnType<typeof createHarness>;
let container: HTMLDivElement;
const onNextSong = vi.fn();
const onResetScore = vi.fn();
const onNewDay = vi.fn();
const writeText = vi.fn((text: string) => Promise.resolve(text));

function mount(overrides: Partial<React.ComponentProps<typeof Result>> = {}) {
  harness.render(
    React.createElement(Result, {
      didGuess: true,
      currentTry: 1,
      solution,
      score: "2/3",
      bagEmpty: false,
      onNextSong,
      onResetScore,
      startTime: 12,
      keyboardEnabled: true,
      mode: "endless",
      round: wonRound(),
      onNewDay,
      streak: { current: 0, before: 0 },
      ...overrides,
    })
  );
}

function buttons() {
  return Array.from(container.querySelectorAll("button"));
}

function click(text: string) {
  const button = buttons().find((b) => b.textContent?.includes(text));
  act(() => {
    button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}

function pressEnter() {
  act(() => {
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
  });
}

beforeEach(() => {
  harness = createHarness();
  container = harness.container;
  Object.assign(navigator, { clipboard: { writeText } });
});

afterEach(() => {
  harness.destroy();
  vi.clearAllMocks();
});

describe("Result on a win", () => {
  it("names the song and the score", () => {
    mount();

    expect(container.textContent).toContain("Constant Moderato");
    expect(container.textContent).toContain("Mitsukiyo");
    expect(container.textContent).toContain("2/3");
  });

  it("uses the singular for a first-try win", () => {
    mount({ currentTry: 1 });

    expect(container.textContent).toContain("in 1 guess.");
  });

  it("uses the plural for later wins", () => {
    mount({ currentTry: 3 });

    expect(container.textContent).toContain("in 3 guesses.");
  });

  it("marks only as much of the clip as was heard", () => {
    mount({ currentTry: 3 });

    // playTimes[2] is 4s.
    expect(container.textContent).toContain("Your clip: 0:12 – 0:16");
  });

  it.each([
    [1, "3★ clear on the first try!"],
    [2, "Sensei's EX Skill landed!"],
    [3, "Mission complete, Sensei~"],
    [4, "Schale pulls through!"],
    [5, "A narrow escape in Kivotos…"],
    [6, "Cleared at the last second!"],
  ])("cheers a win on try %i in Blue Archive terms", (currentTry, message) => {
    mount({ currentTry });

    expect(container.textContent).toContain(message);
  });

  it("announces a place the moment the streak reaches it", () => {
    mount({ streak: { current: 10, before: 9 } });

    expect(container.textContent).toContain(
      "New place unlocked: Abydos Station!"
    );
  });

  it("keeps the next place a secret", () => {
    mount({ streak: { current: 14, before: 13 } });

    expect(container.textContent).not.toContain("Millennium");
    expect(container.textContent).not.toContain("more to");
  });

  it("speaks of days for the daily streak", () => {
    mount({
      mode: "daily",
      didGuess: false,
      round: wonRound(3),
      streak: { current: 0, before: 12 },
    });

    expect(container.textContent).toContain("Your 12-day streak is over");
  });

  it("offers Next Song while songs remain", () => {
    mount();

    click("Next Song");
    expect(onNextSong).toHaveBeenCalled();
    expect(onResetScore).not.toHaveBeenCalled();
  });
});

describe("Result on a loss", () => {
  it("shows the failure message and still reveals the song", () => {
    mount({ didGuess: false, currentTry: 6 });

    expect(container.textContent).toContain("Tactical retreat, Sensei");
    expect(container.textContent).toContain("Arona says");
    expect(container.textContent).toContain("Constant Moderato");
  });

  it("marks the full clip, since every try was used", () => {
    mount({ didGuess: false, currentTry: 6 });

    // Clip started at 0:12 and the last try heard 16s of it.
    expect(container.textContent).toContain("Your clip: 0:12 – 0:28");
  });

  it("offers Continue rather than Next Song", () => {
    mount({ didGuess: false, currentTry: 6 });

    expect(container.textContent).toContain("Continue?");
  });
});

describe("Result when the bag is empty", () => {
  it("offers a reset instead of another song", () => {
    mount({ bagEmpty: true });

    expect(container.textContent).toContain("That was the last song.");

    click("Reset Score");
    expect(onResetScore).toHaveBeenCalled();
    expect(onNextSong).not.toHaveBeenCalled();
  });
});

describe("Result interactions", () => {
  it("copies the score and confirms", async () => {
    mount();

    click("Share result");
    expect(writeText).toHaveBeenCalledOnce();
    expect(writeText.mock.calls[0][0]).toContain("Blue Archive Heardle");
    // The strip describes THIS round - a wrong guess then a win - rather than
    // the lifetime histogram it used to paste.
    expect(writeText.mock.calls[0][0]).toContain("🔈🟥🟩⬜⬜⬜⬜");

    await act(async () => undefined);
    expect(container.textContent).toContain("Copied to your clipboard");
  });

  it("reports a failed copy rather than silently doing nothing", async () => {
    writeText.mockRejectedValueOnce(new Error("denied"));
    mount();

    click("Share result");
    await act(async () => undefined);

    expect(container.textContent).toContain("Copy failed");
  });

  it("advances on Enter", () => {
    mount();

    pressEnter();

    expect(onNextSong).toHaveBeenCalled();
  });

  it("ignores Enter while a dialog is open", () => {
    mount({ keyboardEnabled: false });

    pressEnter();

    expect(onNextSong).not.toHaveBeenCalled();
  });
});

describe("Result in daily mode", () => {
  const daily = { mode: "daily" as const, round: wonRound(42) };

  it("names the puzzle instead of the running score", () => {
    mount(daily);

    expect(container.textContent).toContain("Puzzle #42");
    expect(container.textContent).not.toContain("Score :");
  });

  it("counts down instead of offering another song", () => {
    mount(daily);

    expect(container.textContent).toContain("Next song in");
    expect(buttons().some((b) => b.textContent?.includes("Next Song"))).toBe(
      false
    );
  });

  it("ignores Enter, since there is nothing to advance to", () => {
    mount(daily);

    pressEnter();

    expect(onNextSong).not.toHaveBeenCalled();
  });

  it("shares the puzzle number so results can be compared", () => {
    mount(daily);

    click("Share result");

    const text = writeText.mock.calls[0][0];
    expect(text).toContain("Blue Archive Heardle #42");
    expect(text).not.toContain("Score:");
  });
});
