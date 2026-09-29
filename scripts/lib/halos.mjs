/**
 * How halos are named, shared by the picture script and the weekly Action's
 * check (scripts/find-updates.mjs), so both look for the same files.
 */

/** The wiki's name for a halo where it isn't the student's. */
export const WIKI_NAMES = {
  Aris: "Alice",
  "Shiroko*Terror": "Shiroko Terror",
  "Hatsune Miku": "Miku",
};

/**
 * Students whose halos are the same picture: the wiki has a file for each,
 * but they can't be told apart, so they are one answer.
 */
export const SHARED_HALOS = [["Hikari", "Nozomi"]];

/** A costume's student: "Aru (New Year)" is Aru. */
export const baseName = (name) => name.replace(/ \(.*\)$/, "");

const haloOwner = new Map(
  SHARED_HALOS.flatMap(([first, ...rest]) => rest.map((name) => [name, first]))
);

/** Whose halo a student wears: their own, or a twin's they share. */
export const haloKey = (name) => {
  const base = baseName(name);
  return haloOwner.get(base) ?? base;
};

/** The halo's name on the Fandom wiki, as "<name> Halo.png". */
export const wikiName = (name) => WIKI_NAMES[name] ?? name;
