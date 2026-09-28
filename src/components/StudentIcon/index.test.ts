import React, { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createHarness } from "../../test/harness";

import { students } from "../../constants/students";
import { resetIconSheet } from "../../helpers/iconSheet";
import { StudentIcon } from "./index";

let harness: ReturnType<typeof createHarness>;

/** Images that load (or fail) as soon as they're asked for. */
function fakeImages(fails: (src: string) => boolean) {
  vi.stubGlobal(
    "Image",
    class {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(value: string) {
        queueMicrotask(() => (fails(value) ? this.onerror : this.onload)?.());
      }
    }
  );
}

beforeEach(() => {
  resetIconSheet();
  harness = createHarness();
});

afterEach(() => {
  harness.destroy();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

async function mount(id: number, size: number) {
  harness.render(React.createElement(StudentIcon, { id, size, alt: "x" }));
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  return harness.container.querySelector<HTMLElement>('[role="img"]')!;
}

describe("StudentIcon", () => {
  it("cuts the student's cell out of the sheet", async () => {
    fakeImages(() => false);
    // The 18th student: second row, second column.
    const icon = await mount(students[17].id, 36);

    expect(icon.style.backgroundImage).toContain("pictures/icons.");
    // Cells of 80 px with the icon's 72 inside, at half size.
    expect(icon.style.backgroundPosition).toBe("-42px -42px");
    expect(icon.style.backgroundSize).toBe(
      `640px ${Math.ceil(students.length / 16) * 40}px`
    );
  });

  it("falls back to the copy on R2 when the Worker fails", async () => {
    vi.stubEnv("VITE_AUDIO_BASE_URL", "https://worker.example");
    vi.stubEnv("VITE_AUDIO_BACKUP_URL", "https://r2.example");
    fakeImages((src) => src.startsWith("https://worker.example"));

    const icon = await mount(students[0].id, 36);
    expect(icon.style.backgroundImage).toContain(
      "https://r2.example/pictures/"
    );
  });

  it("keeps a square in place if the sheet fails", async () => {
    fakeImages(() => true);
    vi.stubEnv("VITE_AUDIO_BACKUP_URL", "");
    const icon = await mount(students[0].id, 24);
    expect(icon.style.backgroundColor).not.toBe("");
  });
});
