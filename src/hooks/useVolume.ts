import React from "react";

import { getVolume, subscribeVolume } from "../helpers/volume";

/** The player's current volume, 0-1, re-rendering whenever it changes. */
export function useVolume(): number {
  return React.useSyncExternalStore(subscribeVolume, getVolume);
}

/** Keeps an audio element at the player's volume for as long as it exists. */
export function useAudioVolume(
  audioRef: React.RefObject<HTMLAudioElement | null>,
  /** Anything that swaps the element out, so the new one gets the level too. */
  elementKey?: unknown
): void {
  const volume = useVolume();

  React.useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [audioRef, volume, elementKey]);
}
