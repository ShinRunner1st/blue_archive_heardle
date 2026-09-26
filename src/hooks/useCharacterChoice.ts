import React from "react";

import {
  getCharacterChoice,
  subscribeCharacterChoice,
} from "../helpers/characterChoice";
import { CharacterChoice } from "../types/character";

/** The player's character pick, re-rendering whenever it changes. */
export function useCharacterChoice(): CharacterChoice {
  return React.useSyncExternalStore(
    subscribeCharacterChoice,
    getCharacterChoice
  );
}
