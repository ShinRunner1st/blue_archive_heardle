import React from "react";

import { subscribeCosmetics } from "../helpers/cosmetics";
import {
  missionFacts,
  missionProgress,
  MissionProgress,
  subscribeMissions,
} from "../helpers/missions";

/**
 * Counts each change to the missions cleared or the cosmetics picked, so a
 * component reads them again; they live in storage, not in React.
 */
let version = 0;
const bump = () => {
  version += 1;
};
subscribeMissions(bump);
subscribeCosmetics(bump);

function subscribe(listener: () => void): () => void {
  const offMissions = subscribeMissions(listener);
  const offCosmetics = subscribeCosmetics(listener);
  return () => {
    offMissions();
    offCosmetics();
  };
}

/** Re-renders whenever a mission is cleared or a cosmetic picked. */
export function useMissionsVersion(): number {
  return React.useSyncExternalStore(subscribe, () => version);
}

/** Every mission's progress, read from the saves when the caller shows. */
export function useMissionProgress(): MissionProgress[] {
  const read = () => missionProgress(missionFacts());
  const [progress, setProgress] = React.useState(read);
  React.useEffect(() => subscribe(() => setProgress(read())), []);
  return progress;
}
