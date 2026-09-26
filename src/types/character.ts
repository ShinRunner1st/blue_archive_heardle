/**
 * Which character stands beside the game: Arona and Plana taking turns with
 * the colour scheme, Mari, or nobody.
 */
export type CharacterChoice = "auto" | "mari" | "off";

export function isCharacterChoice(value: unknown): value is CharacterChoice {
  return value === "auto" || value === "mari" || value === "off";
}
