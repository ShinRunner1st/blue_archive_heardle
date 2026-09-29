import { describe, expect, it } from "vitest";

import { PAGE_ORDER, PAGES, pageOfPath, pageUrl } from "./pages";

describe("pages", () => {
  it("gives every page its own title, description and address", () => {
    const infos = PAGE_ORDER.map((page) => PAGES[page]);

    for (const key of ["path", "file", "title", "description"] as const) {
      expect(new Set(infos.map((info) => info[key])).size).toBe(infos.length);
    }
  });

  // Longer and Google cuts it short in the results.
  it("keeps each description short enough for search results", () => {
    for (const page of PAGE_ORDER) {
      expect(PAGES[page].description.length).toBeLessThanOrEqual(160);
    }
  });

  it("builds full addresses, the hub's with its slash", () => {
    expect(pageUrl("hub")).toBe("https://baheardle.com/");
    expect(pageUrl("voice")).toBe("https://baheardle.com/voice");
  });

  it("reads a path however it is written", () => {
    expect(pageOfPath("/")).toBe("hub");
    expect(pageOfPath("")).toBe("hub");
    expect(pageOfPath("/voice")).toBe("voice");
    expect(pageOfPath("/voice/")).toBe("voice");
    expect(pageOfPath("/voice.html")).toBe("voice");
    expect(pageOfPath("/index.html")).toBe("hub");
    expect(pageOfPath("/nowhere")).toBe("hub");
  });
});
