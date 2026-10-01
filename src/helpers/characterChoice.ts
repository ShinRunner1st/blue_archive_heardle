import { CHARACTER_CHOICES } from "../constants/cosmetics";
import { CharacterChoice } from "../types/character";
import { loadClearedMissions } from "./missions";
import { loadCharacterChoice, saveCharacterChoice } from "./storage";
import { unlockedBy } from "./unlocks";

/**
 * Whether the player may have her: off and the free ones always, the others
 * once their mission is cleared. A save file from before it can take one
 * away again.
 */
export function isCharacterUnlocked(choice: CharacterChoice): boolean {
  if (choice === "off") return true;
  const option = CHARACTER_CHOICES.find(({ id }) => id === choice);
  return option !== undefined && unlockedBy(option, loadClearedMissions());
}

/** The player's pick, read from storage lazily. */
let choice: CharacterChoice | null = null;

const listeners = new Set<() => void>();

/** The pick, or Arona and Plana while it isn't unlocked. */
export function getCharacterChoice(): CharacterChoice {
  if (choice === null) choice = loadCharacterChoice();
  return isCharacterUnlocked(choice) ? choice : "auto";
}

export function setCharacterChoice(next: CharacterChoice): void {
  if (next === getCharacterChoice() || !isCharacterUnlocked(next)) return;
  choice = next;
  saveCharacterChoice(next);
  listeners.forEach((listener) => listener());
}

export function subscribeCharacterChoice(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Forgets the cached pick, for tests. */
export function resetCharacterChoiceState(): void {
  choice = null;
}
