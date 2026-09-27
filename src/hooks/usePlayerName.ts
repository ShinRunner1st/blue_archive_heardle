import React from "react";

import { getPlayerName, subscribePlayerName } from "../helpers/playerName";

/** The name for shared pictures, re-rendering whenever it changes. */
export function usePlayerName(): string {
  return React.useSyncExternalStore(subscribePlayerName, getPlayerName);
}
