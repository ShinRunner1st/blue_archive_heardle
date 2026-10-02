/**
 * Undo and redo for the tool's draft. Changes that come quickly one after
 * another are one step, so a drag, a slider or a word typed undoes at
 * once rather than a frame or a letter at a time.
 */

/** Changes closer together than this are one step. */
export const STEP_GAP_MS = 600;
/** Steps kept to go back to. */
export const HISTORY_LIMIT = 200;

export interface History<T> {
  past: T[];
  present: T;
  future: T[];
  /** When the present step was last changed; 0 once it's closed. */
  lastEdit: number;
}

export type HistoryAction<T> =
  /** A change, `at` its time: a step of its own, or the present one's. */
  | { type: "edit"; change: (present: T) => T; at: number }
  /** A change that's always a step of its own, as Discard. */
  | { type: "step"; next: T }
  | { type: "undo" }
  | { type: "redo" }
  /** A new start with nothing to undo, as when the files load. */
  | { type: "reset"; next: T };

export const startHistory = <T>(present: T): History<T> => ({
  past: [],
  present,
  future: [],
  lastEdit: 0,
});

export function historyReducer<T>(
  history: History<T>,
  action: HistoryAction<T>
): History<T> {
  switch (action.type) {
    case "reset":
      return startHistory(action.next);
    case "edit":
    case "step": {
      const next =
        action.type === "edit" ? action.change(history.present) : action.next;
      if (next === history.present) return history;
      const at = action.type === "edit" ? action.at : 0;
      const sameStep =
        action.type === "edit" &&
        history.lastEdit > 0 &&
        at - history.lastEdit < STEP_GAP_MS;
      return {
        past: sameStep
          ? history.past
          : [...history.past, history.present].slice(-HISTORY_LIMIT),
        present: next,
        future: [],
        lastEdit: at,
      };
    }
    case "undo": {
      const previous = history.past[history.past.length - 1];
      if (previous === undefined) return history;
      return {
        past: history.past.slice(0, -1),
        present: previous,
        future: [history.present, ...history.future],
        lastEdit: 0,
      };
    }
    case "redo": {
      const [next, ...rest] = history.future;
      if (next === undefined) return history;
      return {
        past: [...history.past, history.present],
        present: next,
        future: rest,
        lastEdit: 0,
      };
    }
  }
}

/**
 * Which way a key press goes: Ctrl+Z (⌘Z) back, Ctrl+Y or Ctrl+Shift+Z
 * forward; anything else, neither.
 */
export function undoKey(event: {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
}): "undo" | "redo" | null {
  if (!(event.ctrlKey || event.metaKey) || event.altKey) return null;
  const key = event.key.toLowerCase();
  if (key === "z") return event.shiftKey ? "redo" : "undo";
  if (key === "y" && !event.shiftKey) return "redo";
  return null;
}
