import React, { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createHarness } from "../../test/harness";

import { students } from "../../constants/students";
import { StudentRound } from "../../types/student";
import { StudentGame } from "./index";

let harness: ReturnType<typeof createHarness>;
let container: HTMLDivElement;

const byName = (name: string) => {
  const found = students.find((student) => student.name === name);
  if (!found) throw new Error(`no ${name}`);
  return found;
};
const hoshino = byName("Hoshino");
const aru = byName("Aru");
const hina = byName("Hina");

const onGuess = vi.fn();
const onGiveUp = vi.fn();
const onNext = vi.fn();

function mount(
  round: StudentRound,
  extra: Partial<React.ComponentProps<typeof StudentGame>> = {}
) {
  harness.render(
    React.createElement(StudentGame, {
      game: "gameplay",
      mode: "endless",
      round,
      score: "3/4",
      streak: { current: 0, before: 0 },
      onGuess,
      onGiveUp,
      onNext,
      onNewDay: vi.fn(),
      keyboardEnabled: true,
      ...extra,
    })
  );
}

function input() {
  return container.querySelector("input")!;
}

function type(text: string) {
  act(() => {
    const el = input();
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      "value"
    )!.set!;
    setter.call(el, text);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

function press(key: string) {
  act(() => {
    input().dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
  });
}

function options() {
  return Array.from(container.querySelectorAll('[role="option"]'));
}

function button(label: string) {
  return Array.from(container.querySelectorAll("button")).find(
    (b) => b.textContent === label
  );
}

beforeEach(() => {
  harness = createHarness();
  container = harness.container;
  onGuess.mockReset();
  onGiveUp.mockReset();
  onNext.mockReset();
});

afterEach(() => {
  harness.destroy();
});

describe("StudentGame search", () => {
  it("picks the student clicked, and guesses them on Guess", () => {
    mount({ answer: hoshino.id, guesses: [] });
    expect(button("Guess")?.disabled).toBe(true);
    type("hoshino");

    const first = options()[0];
    expect(first.textContent).toContain("Hoshino");
    act(() => (first as HTMLElement).click());

    // Picked, not guessed: the box holds the name until it's confirmed.
    expect(onGuess).not.toHaveBeenCalled();
    expect(input().value).toBe("Hoshino");
    expect(options()).toHaveLength(0);

    act(() => button("Guess")?.click());
    expect(onGuess).toHaveBeenCalledWith(hoshino.id);
    expect(input().value).toBe("");
  });

  it("picks the top name on Enter, and guesses it on the next", () => {
    mount({ answer: hoshino.id, guesses: [] });
    type("aru");
    press("Enter");
    expect(onGuess).not.toHaveBeenCalled();
    expect(input().value).toBe("Aru");
    press("Enter");
    expect(onGuess).toHaveBeenCalledWith(aru.id);
  });

  it("drops the pick when the name is typed over", () => {
    mount({ answer: hoshino.id, guesses: [] });
    type("aru");
    press("Enter");
    type("hin");
    expect(button("Guess")?.disabled).toBe(true);
    expect(options().length).toBeGreaterThan(0);
  });

  it("moves through the names with the arrow keys", () => {
    mount({ answer: hoshino.id, guesses: [] });
    type("hoshino");
    press("ArrowDown");
    press("ArrowDown");
    press("Enter");
    press("Enter");
    const second = students.filter(({ name }) => name.startsWith("Hoshino"))[1];
    expect(onGuess).toHaveBeenCalledWith(second.id);
  });

  it("picks a random first guess, never the answer", () => {
    mount({ answer: hoshino.id, guesses: [] });
    for (let i = 0; i < 20; i++) {
      act(() => button("Random first guess")?.click());
      expect(input().value).not.toBe("");
      expect(input().value).not.toBe("Hoshino");
    }
    expect(onGuess).not.toHaveBeenCalled();
  });

  it("leaves out students already guessed", () => {
    mount({ answer: hoshino.id, guesses: [aru.id] });
    type("aru");
    // The costumes are still there; Aru herself isn't.
    const names = options().map(
      (option) => option.querySelector("span span")?.textContent
    );
    expect(names).toContain("Aru (New Year)");
    expect(names).not.toContain("Aru");
  });

  it("clears on Esc", () => {
    mount({ answer: hoshino.id, guesses: [] });
    type("hina");
    press("Escape");
    expect(input().value).toBe("");
    expect(options()).toHaveLength(0);
  });
});

describe("StudentGame clock", () => {
  it("shows the time so far once started, and on the result", () => {
    mount({ answer: hoshino.id, guesses: [] });
    expect(container.querySelector('[role="timer"]')).toBeNull();

    mount({ answer: hoshino.id, guesses: [aru.id], startedAt: Date.now() });
    expect(container.querySelector('[role="timer"]')?.textContent).toBe("0:00");

    mount({
      answer: hoshino.id,
      guesses: [aru.id, hoshino.id],
      startedAt: 0,
      time: 102_000,
    });
    expect(container.textContent).toContain(
      "You found Hoshino in 2 guesses, in 1:42."
    );
  });
});

describe("StudentGame guesses", () => {
  it("shows each guess against the answer, newest first", () => {
    mount({ answer: hoshino.id, guesses: [aru.id, hina.id] });

    const rows = container.querySelectorAll('[role="rowheader"]');
    expect(Array.from(rows).map((row) => row.textContent)).toEqual([
      "Hina",
      "Aru",
    ]);
    const cells = Array.from(container.querySelectorAll('[role="cell"]')).map(
      (cell) => cell.getAttribute("aria-label")
    );
    expect(cells).toContain("School Gehenna, wrong");
    expect(cells).toContain(`EX Cost ${aru.exCost}, right`);
  });

  it("uses Lore's columns in Lore", () => {
    mount({ answer: hoshino.id, guesses: [aru.id] }, { game: "lore" });
    const heads = Array.from(
      container.querySelectorAll('[role="columnheader"]')
    ).map((head) => head.textContent);
    expect(heads).toContain("Birthday");
    expect(heads).not.toContain("Role");
  });

  it("gives up only on a second press", () => {
    mount({ answer: hoshino.id, guesses: [aru.id] });
    act(() => button("Give up")?.click());
    expect(onGiveUp).not.toHaveBeenCalled();
    act(() => button("Sure?")?.click());
    expect(onGiveUp).toHaveBeenCalledTimes(1);
  });

  it("can't give up before the first guess", () => {
    mount({ answer: hoshino.id, guesses: [] });
    expect(button("Give up")?.disabled).toBe(true);
  });
});

describe("StudentGame result", () => {
  it("names the answer and moves on to the next student", () => {
    mount({ answer: hoshino.id, guesses: [aru.id, hoshino.id] });

    expect(container.textContent).toContain("You found Hoshino in 2 guesses.");
    expect(container.textContent).toContain("Score : 3/4");
    expect(input()).toBeNull();

    act(() => button("Next student")?.click());
    expect(onNext).toHaveBeenCalledTimes(1);

    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
    });
    expect(onNext).toHaveBeenCalledTimes(2);
  });

  it("shows the answer after giving up", () => {
    mount({ answer: hoshino.id, guesses: [aru.id], gaveUp: true });
    expect(container.textContent).toContain("Tactical retreat");
    expect(container.textContent).toContain("Hoshino");
    expect(button("Continue?")).toBeDefined();
  });

  it("counts down to tomorrow's student in daily, with no next", () => {
    mount(
      { answer: hoshino.id, guesses: [hoshino.id], day: 4 },
      { mode: "daily" }
    );
    expect(container.textContent).toContain("Puzzle #4");
    expect(container.textContent).toContain("Next student in");
    expect(button("Next student")).toBeUndefined();
  });

  it("copies a result that doesn't name the student", async () => {
    const writeText = vi.fn<(text: string) => Promise<void>>(() =>
      Promise.resolve()
    );
    Object.assign(navigator, { clipboard: { writeText } });
    mount(
      { answer: hoshino.id, guesses: [aru.id, hoshino.id], day: 4 },
      { mode: "daily" }
    );

    await act(async () => button("Share result")?.click());

    const text = writeText.mock.calls[0]?.[0] ?? "";
    expect(text).toContain("Students (Gameplay) #4");
    expect(text).toContain("Found in 2 guesses");
    expect(text).not.toContain("Hoshino");
    expect(button("Copied to your clipboard")).toBeDefined();
  });
});

describe("StudentGame icons", () => {
  it("shows school and role icons, with short names under them", () => {
    mount({ answer: hoshino.id, guesses: [aru.id] });
    const cell = (label: string) =>
      Array.from(container.querySelectorAll('[role="cell"]')).find((c) =>
        c.getAttribute("aria-label")?.startsWith(label)
      );

    const school = cell("School Gehenna");
    expect(school?.querySelector("span[style]")).not.toBeNull();
    expect(school?.textContent).toBe("Gehenna");
    // No icons for weapons: the name alone.
    expect(cell("Weapon")?.querySelector("span[style]")).toBeNull();
  });

  it("shows a gift's icon alone, its name too long to fit", () => {
    mount({ answer: hoshino.id, guesses: [aru.id] }, { game: "lore" });
    const gift = Array.from(container.querySelectorAll('[role="cell"]')).find(
      (c) => c.getAttribute("aria-label")?.startsWith("Fav Gift")
    );
    expect(gift?.querySelector("span[style]")).not.toBeNull();
    expect(gift?.textContent).toBe("");
  });
});

describe("StudentGame student list", () => {
  function openList() {
    act(() =>
      container
        .querySelector<HTMLButtonElement>('[aria-label="Browse all students"]')
        ?.click()
    );
  }
  const tiles = () =>
    Array.from(
      document.querySelectorAll<HTMLButtonElement>(
        '[role="dialog"] button[title]'
      )
    );

  it("shows the pool by name, not release order", () => {
    mount({ answer: hoshino.id, guesses: [] }, { game: "lore" });
    openList();

    const names = tiles().map((tile) => tile.title);
    expect(names).toHaveLength(
      students.filter(({ lore, global }) => lore && global).length
    );
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
  });

  it("picks the student chosen, and fades the ones guessed", () => {
    mount({ answer: hoshino.id, guesses: [aru.id] });
    openList();

    const aruTile = tiles().find((tile) => tile.title === "Aru");
    expect(aruTile?.disabled).toBe(true);

    act(() =>
      tiles()
        .find((tile) => tile.title === "Hina")
        ?.click()
    );
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(input().value).toBe("Hina");
    act(() => button("Guess")?.click());
    expect(onGuess).toHaveBeenCalledWith(hina.id);
  });
});
