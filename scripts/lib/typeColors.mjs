/**
 * The colours Blue Archive gives each attack type and the armour it hits
 * hardest, by SchaleDB's codes, for the circles the sword and shield icons
 * are drawn on in the clue sheet: red for Explosive and Light, yellow for
 * Piercing and Heavy, blue for Mystic and Special, purple for Sonic and
 * Elastic, green for the newer Corrosive and Composite.
 *
 * When the game adds a type, build-students draws it on grey and says so:
 * add its code here and run `npm run students` again.
 */
export const TYPE_COLORS = {
  Explosion: "#E5484D",
  LightArmor: "#E5484D",
  Pierce: "#E9A714",
  HeavyArmor: "#E9A714",
  Mystic: "#2F8FE0",
  Unarmed: "#2F8FE0",
  Sonic: "#A45CD6",
  ElasticArmor: "#A45CD6",
  Chemical: "#3FB36B",
  CompositeArmor: "#3FB36B",
};

/** For a type with no colour here yet. */
export const UNKNOWN_TYPE_COLOR = "#8A94A6";
