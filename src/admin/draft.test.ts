import { describe, expect, it } from "vitest";

import type { ContentFiles, IdsLock } from "../content/types";
import { changedFiles, freeId, moved, slugOf, stepped } from "./draft";
import { isOwnRequest } from "./server";
import { isShipped, nextLock } from "./lock";

describe("slugOf and freeId", () => {
  it("makes an id from a name", () => {
    expect(slugOf("Record collector!")).toBe("record-collector");
    expect(slugOf("  Café  Ōtori ")).toBe("cafe-otori");
    expect(slugOf("a".repeat(40))).toHaveLength(32);
  });

  it("finds one not taken", () => {
    expect(freeId("ost-100", ["ost-100", "ost-100-2"])).toBe("ost-100-3");
    expect(freeId("", [])).toBe("new");
  });
});

describe("moving items", () => {
  it("moves one to a place", () => {
    expect(moved(["a", "b", "c"], 0, 2)).toEqual(["b", "c", "a"]);
    expect(moved(["a", "b"], 0, 5)).toEqual(["a", "b"]);
  });

  it("steps one past items of other tabs, which stay put", () => {
    const list = ["o1", "v1", "o2", "v2"];
    const ost = (id: string) => id.startsWith("o");
    expect(stepped(list, "o2", -1, ost)).toEqual(["o2", "v1", "o1", "v2"]);
    expect(stepped(list, "o1", -1, ost)).toEqual(list);
  });
});

describe("the lock", () => {
  const files = (missions: string[], titles: string[]) =>
    ({
      missions: { groups: [], missions: missions.map((id) => ({ id })) },
      cosmetics: {
        titles: titles.map((id) => ({ id })),
        cardColors: [],
        cursorColors: [],
        characters: [],
        banners: [],
        frames: [],
        backgrounds: [],
        nameEffects: [],
      },
    } as unknown as ContentFiles);
  const shipped = { missions: ["a", "b"], titles: ["t"] } as IdsLock;

  it("keeps every shipped id and adds the new ones after", () => {
    expect(nextLock(shipped, files(["c", "b", "a"], ["t"]))).toMatchObject({
      missions: ["a", "b", "c"],
      titles: ["t"],
      frames: [],
    });
  });

  it("keeps a shipped id gone from the files, so the check refuses it", () => {
    expect(nextLock(shipped, files(["a"], [])).missions).toEqual(["a", "b"]);
  });

  it("forgets an id never shipped once it's renamed or deleted", () => {
    expect(nextLock(shipped, files(["a", "b", "d"], ["t"])).missions).toEqual([
      "a",
      "b",
      "d",
    ]);
    expect(isShipped(shipped, "missions", "d")).toBe(false);
    expect(isShipped(shipped, "missions", "a")).toBe(true);
  });
});

describe("changedFiles", () => {
  it("names the files that differ", () => {
    const a = { seasons: [], badges: [1] } as unknown as ContentFiles;
    const b = { seasons: [], badges: [2] } as unknown as ContentFiles;
    expect(changedFiles(a, b)).toEqual(["badges"]);
  });
});

describe("isOwnRequest", () => {
  const own = {
    host: "127.0.0.1:5180",
    origin: "http://127.0.0.1:5180",
    "content-type": "application/json",
  };

  it("answers the tool's own page", () => {
    expect(isOwnRequest(own, true)).toBe(true);
    expect(isOwnRequest({ host: "localhost:5180" }, false)).toBe(true);
  });

  it("refuses other sites, other names and plain forms", () => {
    expect(isOwnRequest({ ...own, origin: "https://evil.example" }, true)).toBe(
      false
    );
    expect(isOwnRequest({ ...own, host: "evil.example:5180" }, false)).toBe(
      false
    );
    expect(isOwnRequest({ ...own, "content-type": "text/plain" }, true)).toBe(
      false
    );
    expect(isOwnRequest({ host: own.host }, true)).toBe(false);
  });
});
