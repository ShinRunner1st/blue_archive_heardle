import React from "react";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createHarness } from "../../test/harness";

import { students } from "../../constants/students";
import { BirthdayNote } from "./index";

let harness: ReturnType<typeof createHarness>;

const three = students.filter(({ lore }) => lore).slice(0, 3);

function mount(list = three) {
  harness.render(React.createElement(BirthdayNote, { students: list }));
}

beforeEach(() => {
  harness = createHarness();
});

afterEach(() => {
  harness.destroy();
});

describe("BirthdayNote", () => {
  it("wishes each student a happy birthday", () => {
    mount(three.slice(0, 1));
    expect(harness.container.textContent).toBe(
      `Happy birthday, ${three[0].name}! 🎂`
    );

    mount(three);
    expect(harness.container.textContent).toContain(
      `${three[0].name}, ${three[1].name} and ${three[2].name}!`
    );
  });

  it("shows each student's portrait, from the Worker", async () => {
    mount(three);
    // The portraits' list loads on its own, as it does on the page.
    await act(async () => {
      await import("../../constants/portraitFiles");
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    const images = harness.container.querySelectorAll("img");
    expect(images).toHaveLength(3);
    expect(images[0].getAttribute("src")).toMatch(/pictures\/.+\.webp$/);
  });

  it("is nothing on a day with no birthday", () => {
    mount([]);
    expect(harness.container.textContent).toBe("");
  });
});
