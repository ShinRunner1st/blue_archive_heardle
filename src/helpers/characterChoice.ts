import { CharacterChoice } from "../types/character";
import { loadCharacterChoice, saveCharacterChoice } from "./storage";

/** The player's pick, read from storage lazily. */
let choice: CharacterChoice | null = null;

const listeners = new Set<() => void>();

export function getCharacterChoice(): CharacterChoice {
  if (choice === null) choice = loadCharacterChoice();
  return choice;
}

export function setCharacterChoice(next: CharacterChoice): void {
  if (next === getCharacterChoice()) return;
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
