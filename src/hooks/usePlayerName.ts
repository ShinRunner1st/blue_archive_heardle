import React from "react";

import {
  getFavStudent,
  getPlayerName,
  getSenseiTitle,
  pictureName,
  subscribePlayerName,
} from "../helpers/playerName";

/** The name for shared pictures, re-rendering whenever it changes. */
export function usePlayerName(): string {
  return React.useSyncExternalStore(subscribePlayerName, getPlayerName);
}

/** The favourite student, the card's picture, kept up to date. */
export function useFavStudent(): number | null {
  return React.useSyncExternalStore(subscribePlayerName, getFavStudent);
}

/** Whether "Sensei" goes before the name on pictures. */
export function useSenseiTitle(): boolean {
  return React.useSyncExternalStore(subscribePlayerName, getSenseiTitle);
}

/** The name as pictures show it (see pictureName), kept up to date. */
export function usePictureName(): string {
  const name = usePlayerName();
  const title = useSenseiTitle();
  return pictureName(name, title);
}
