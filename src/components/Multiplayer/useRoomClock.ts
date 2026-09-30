import React from "react";

import { ClientMessage } from "../../types/room";

/** How often a clock on screen is redrawn. */
const DRAW_MS = 200;
/** How long after one of the room's times the page says it passed. */
export const TICK_AFTER_MS = 100;

/** The time now, redrawn a few times a second for the clocks on screen. */
export function useNow(): number {
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), DRAW_MS);
    return () => window.clearInterval(timer);
  }, []);
  return now;
}

/**
 * Tells the room once that a time of its has passed: the room has no
 * timers of its own (see docs/multiplayer.md), so the standings end and an
 * idle lobby closes on the first page's tick. `key` names the time, so a
 * new view with the same one doesn't send it twice.
 */
export function useTickAt(
  send: (message: ClientMessage) => void,
  key: string,
  at: number | null
): void {
  const sent = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (at === null || sent.current === key) return;
    const timer = window.setTimeout(() => {
      sent.current = key;
      send({ t: "tick" });
    }, Math.max(0, at + TICK_AFTER_MS - Date.now()));
    return () => window.clearTimeout(timer);
  }, [send, key, at]);
}
