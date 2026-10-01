import { CharacterId, spineCharacters } from "../constants/characters";

/**
 * Which character stands beside the game: Arona and Plana taking turns with
 * the colour scheme ("auto"), one of the others, or nobody ("off"). Which
 * of the others a player may pick is in src/content/cosmetics.json.
 */
export type CharacterChoice =
  | "auto"
  | "off"
  | Exclude<CharacterId, "arona" | "plana">;

/** Every character but the pair "auto" stands for. */
const OTHERS: string[] = Object.keys(spineCharacters).filter(
  (id) => id !== "arona" && id !== "plana"
);

export function isCharacterChoice(value: unknown): value is CharacterChoice {
  return (
    value === "auto" || value === "off" || OTHERS.includes(value as string)
  );
}
