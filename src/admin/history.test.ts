import { describe, expect, it } from "vitest";

import {
  HISTORY_LIMIT,
  historyReducer,
  startHistory,
  STEP_GAP_MS,
  undoKey,
} from "./history";

const edit = (next: string, at: number) =>
  ({ type: "edit", change: () => next, at } as const);

describe("historyReducer", () => {
  it("makes changes close together one step, and apart two", () => {
    let history = startHistory("a");
    history = historyReducer(history, edit("ab", 1000));
    history = historyReducer(history, edit("abc", 1000 + STEP_GAP_MS - 1));
    history = historyReducer(history, edit("abcd", 1000 + STEP_GAP_MS * 3));
    expect(history.past).toEqual(["a", "abc"]);
    history = historyReducer(history, { type: "undo" });
    expect(history.present).toBe("abc");
    history = historyReducer(history, { type: "undo" });
    expect(history.present).toBe("a");
    history = historyReducer(history, { type: "undo" });
    expect(history.present).toBe("a");
  });

  it("redoes until a new change, which drops what was undone", () => {
    let history = startHistory("a");
    history = historyReducer(history, edit("b", 1000));
    history = historyReducer(history, { type: "undo" });
    history = historyReducer(history, { type: "redo" });
    expect(history.present).toBe("b");
    history = historyReducer(history, { type: "undo" });
    // Straight after an undo, a change is a step of its own.
    history = historyReducer(history, edit("c", 1001));
    expect(history).toMatchObject({ past: ["a"], present: "c", future: [] });
  });

  it("keeps Discard as its own step, and a reset with nothing to undo", () => {
    let history = startHistory("a");
    history = historyReducer(history, edit("b", 1000));
    history = historyReducer(history, { type: "step", next: "a" });
    expect(history.past).toEqual(["a", "b"]);
    history = historyReducer(history, { type: "reset", next: "z" });
    expect(history).toMatchObject({ past: [], present: "z", future: [] });
  });

  it("keeps the last steps only", () => {
    let history = startHistory(0);
    for (let i = 1; i <= HISTORY_LIMIT + 50; i++) {
      history = historyReducer(history, {
        type: "edit",
        change: () => i,
        at: i * STEP_GAP_MS * 2,
      });
    }
    expect(history.past).toHaveLength(HISTORY_LIMIT);
  });
});

describe("undoKey", () => {
  const press = (key: string, more: Partial<KeyboardEvent> = {}) =>
    undoKey({
      key,
      ctrlKey: true,
      metaKey: false,
      shiftKey: false,
      altKey: false,
      ...more,
    });

  it("reads Ctrl+Z, Ctrl+Y and Ctrl+Shift+Z", () => {
    expect(press("z")).toBe("undo");
    expect(press("Z", { shiftKey: true })).toBe("redo");
    expect(press("y")).toBe("redo");
    expect(press("z", { ctrlKey: false, metaKey: true })).toBe("undo");
    expect(press("z", { ctrlKey: false })).toBeNull();
    expect(press("s")).toBeNull();
  });
});
