import React from "react";

import { Mission } from "../constants/missions";
import { checkMissions } from "../helpers/missions";
import { subscribeSaved } from "../helpers/storage";

/** A mission just cleared, or how many were cleared before missions came. */
export type MissionToastItem =
  | { kind: "mission"; mission: Mission }
  | { kind: "summary"; count: number };

/**
 * Long enough after a save for the round's result to show first, and for a
 * burst of saves (a guess, then the round's end) to make one check.
 */
const SETTLE_MS = 900;
/** The first check, once the page has settled after loading. */
const FIRST_CHECK_MS = 2500;

/**
 * Checks the missions after each save of a game's rounds, and queues a
 * toast for each newly cleared. The first check on a device clears what the
 * saves already earned, as one toast with the count.
 */
export function useMissionToasts(): {
  toast: MissionToastItem | null;
  dismiss: () => void;
} {
  const [queue, setQueue] = React.useState<MissionToastItem[]>([]);

  React.useEffect(() => {
    const check = () => {
      const { cleared, first } = checkMissions();
      if (cleared.length === 0) return;
      setQueue((was) => [
        ...was,
        ...(first
          ? [{ kind: "summary" as const, count: cleared.length }]
          : cleared.map((mission) => ({ kind: "mission" as const, mission }))),
      ]);
    };
    let timer = window.setTimeout(check, FIRST_CHECK_MS);
    const off = subscribeSaved(() => {
      window.clearTimeout(timer);
      timer = window.setTimeout(check, SETTLE_MS);
    });
    return () => {
      off();
      window.clearTimeout(timer);
    };
  }, []);

  const dismiss = React.useCallback(() => setQueue((was) => was.slice(1)), []);
  return { toast: queue[0] ?? null, dismiss };
}
