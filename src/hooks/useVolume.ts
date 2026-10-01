import React from "react";

import { getVolume, subscribeVolume, VolumeChannel } from "../helpers/volume";

/** The player's current volume, 0-1, re-rendering whenever it changes. */
export function useVolume(channel: VolumeChannel = "game"): number {
  return React.useSyncExternalStore(subscribeVolume, () => getVolume(channel));
}

/** Keeps an audio element at the player's volume for as long as it exists. */
export function useAudioVolume(
  audioRef: React.RefObject<HTMLAudioElement | null>,
  /** Anything that swaps the element out, so the new one gets the level too. */
  elementKey?: unknown,
  channel: VolumeChannel = "game"
): void {
  const volume = useVolume(channel);

  React.useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [audioRef, volume, elementKey]);
}
