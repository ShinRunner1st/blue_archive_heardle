import React, { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createHarness } from "../../test/harness";

import { students } from "../../constants/students";
import { loadFavStudent, saveFavStudent } from "../../helpers/storage";
import SenseiCard from "./index";

vi.mock("../../helpers/picture/senseiCard", () => ({
  makeSenseiCard: vi.fn(() => Promise.resolve(new Blob(["png"]))),
  senseiCardName: () => "card.png",
}));

let harness: ReturnType<typeof createHarness>;

function type(text: string) {
  act(() => {
    const input = document.querySelector("input")!;
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value"
    )!.set!.call(input, text);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

async function mount() {
  harness.render(
    React.createElement(SenseiCard, { onClose: vi.fn(), streak: 0 })
  );
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 200));
  });
}

beforeEach(() => {
  localStorage.clear();
  URL.createObjectURL = vi.fn(() => "blob:card");
  URL.revokeObjectURL = vi.fn();
  harness = createHarness();
});

afterEach(() => {
  harness.destroy();
});

describe("SenseiCard", () => {
  it("shows the card once drawn", async () => {
    await mount();
    expect(
      document.querySelector('img[alt="Your Sensei card"]')
    ).not.toBeNull();
  });

  it("picks a favourite student and remembers it", async () => {
    await mount();
    type("hoshino");
    act(() =>
      (document.querySelector('[role="option"]') as HTMLElement).click()
    );

    const hoshino = students.find(({ name }) => name === "Hoshino")!;
    expect(loadFavStudent()).toBe(hoshino.id);
    expect(document.body.textContent).toContain("Remove");
  });

  it("takes the favourite away", async () => {
    saveFavStudent(students[0].id);
    await mount();
    act(() =>
      Array.from(document.querySelectorAll("button"))
        .find((button) => button.textContent === "Remove")
        ?.click()
    );
    expect(loadFavStudent()).toBeNull();
  });
});
