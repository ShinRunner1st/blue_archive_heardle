import React from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createHarness } from "../../test/harness";

import { students } from "../../constants/students";
import { BirthdayNote } from "./index";

let harness: ReturnType<typeof createHarness>;

const three = students.filter(({ lore }) => lore).slice(0, 3);

function mount(list = three, withIcons = false) {
  harness.render(
    React.createElement(BirthdayNote, { students: list, withIcons })
  );
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
      `🎂Happy birthday, ${three[0].name}!`
    );

    mount(three);
    expect(harness.container.textContent).toContain(
      `${three[0].name}, ${three[1].name} and ${three[2].name}!`
    );
  });

  it("shows icons only when asked", () => {
    mount(three, false);
    expect(harness.container.querySelectorAll("span[style]")).toHaveLength(0);

    mount(three, true);
    expect(harness.container.querySelectorAll("span[style]")).toHaveLength(3);
  });

  it("is nothing on a day with no birthday", () => {
    mount([]);
    expect(harness.container.textContent).toBe("");
  });
});
