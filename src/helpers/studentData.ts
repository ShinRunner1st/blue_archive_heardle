/**
 * Turns SchaleDB's data (students.json, localization.json and items.json from
 * schaledb.com/data/en/) into the student table the game ships with. Used by
 * scripts/build-students.mjs at build time; the game never asks SchaleDB for
 * anything.
 *
 * SchaleDB can change its format without notice, so everything is checked on
 * the way in: anything missing or of the wrong kind throws, naming the student
 * and the field, and the script stops before writing a thing. The live site
 * keeps the table it already has.
 *
 * No runtime imports: the build script loads this file directly with Node.
 */
import type { Birthday, Student } from "../types/student";

type Json = Record<string, unknown>;

/** Global is the second server in SchaleDB's lists: Japan, Global, China. */
const GLOBAL = 1;

class FormatError extends Error {
  constructor(message: string) {
    super(`SchaleDB's data has changed: ${message}`);
  }
}

function isObject(value: unknown): value is Json {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** A table SchaleDB keeps either as a list or keyed by id. */
function entriesOf(value: unknown, what: string): Json[] {
  const list = Array.isArray(value)
    ? value
    : isObject(value)
    ? Object.values(value)
    : null;
  if (!list || !list.every(isObject)) {
    throw new FormatError(`${what} is not a list of entries`);
  }
  return list;
}

function field<T>(
  entry: Json,
  key: string,
  check: (value: unknown) => value is T,
  what: string
): T {
  const value = entry[key];
  if (!check(value)) {
    const name = typeof entry.Name === "string" ? entry.Name : "an entry";
    throw new FormatError(`${name}'s ${key} is not ${what}`);
  }
  return value;
}

const isString = (value: unknown): value is string => typeof value === "string";
const isNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);
const isStrings = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every(isString);
const isBooleans = (value: unknown): value is boolean[] =>
  Array.isArray(value) &&
  value.length > GLOBAL &&
  value.every((item) => typeof item === "boolean");
const isNumbers = (value: unknown): value is number[] =>
  Array.isArray(value) && value.length > 0 && value.every(isNumber);

/** "145cm" as 145. The game leaves a few blank ("-"), so null for those. */
export function parseHeight(text: string): number | null {
  const match = /^(\d{2,3})\s*cm$/.exec(text.trim());
  return match ? Number(match[1]) : null;
}

/**
 * A birthday from SchaleDB's short form, "1/2" for January 2nd: steadier than
 * the long one, which drops its "nd" now and then. Null where the game gives
 * none.
 */
export function parseBirthday(text: string): Birthday | null {
  const match = /^(\d{1,2})\/(\d{1,2})$/.exec(text.trim());
  if (!match) return null;
  const month = Number(match[1]);
  const day = Number(match[2]);
  const days = new Date(2024, month, 0).getDate(); // A leap year: 29 Feb.
  return month >= 1 && month <= 12 && day >= 1 && day <= days
    ? [month, day]
    : null;
}

/** The school year as shown, or "Unknown" where the game gives none. */
export function schoolYear(text: string): string {
  return text.trim() || "Unknown";
}

interface Gift {
  name: string;
  tags: string[];
  /** SchaleDB's name for its icon. */
  icon: string;
}

/**
 * The SSR gifts a student likes best. The game rates a gift by how many of
 * its tags the student shares, counting their personal tags too, so the ones
 * sharing the most win. Only gifts sharing at least one count: a guest from
 * another series with no tags has no favourite.
 */
export function favouriteGifts(
  studentTags: string[],
  gifts: Array<Pick<Gift, "name" | "tags">>
): string[] {
  const tags = new Set(studentTags);
  const shared = gifts.map((gift) => ({
    name: gift.name,
    count: gift.tags.filter((tag) => tags.has(tag)).length,
  }));
  const best = Math.max(0, ...shared.map(({ count }) => count));
  if (best === 0) return [];
  return shared.filter(({ count }) => count === best).map(({ name }) => name);
}

/** A name from localization.json, which must have one for every code used. */
function localize(
  localization: Json,
  table: string,
  code: string,
  student: string
): string {
  const names = localization[table];
  if (!isObject(names)) throw new FormatError(`localization has no ${table}`);
  const name = names[code];
  if (!isString(name)) {
    throw new FormatError(`no English name for ${student}'s ${table} ${code}`);
  }
  return name;
}

/** The SSR gifts out on Global, by name and tags. */
function ssrGifts(items: unknown): Gift[] {
  return entriesOf(items, "items.json")
    .filter((item) => item.Category === "Favor" && item.Rarity === "SSR")
    .filter((item) => field(item, "IsReleased", isBooleans, "a list")[GLOBAL])
    .map((item) => ({
      name: field(item, "Name", isString, "text"),
      tags: field(item, "Tags", isStrings, "a list of tags"),
      icon: field(item, "Icon", isString, "text"),
    }));
}

/**
 * The student table: every student and costume out on Global, in release
 * order. A student listed twice under one name (Hoshino (Armed), once per
 * form) keeps the first.
 */
export function convertStudents(
  students: unknown,
  localization: unknown,
  items: unknown
): Student[] {
  if (!isObject(localization)) {
    throw new FormatError("localization.json is not an object");
  }
  const gifts = ssrGifts(items);
  if (gifts.length === 0) throw new FormatError("items.json has no SSR gifts");

  const seen = new Set<string>();
  const table: Student[] = [];

  const entries = entriesOf(students, "students.json")
    .filter((entry) => field(entry, "IsReleased", isBooleans, "a list")[GLOBAL])
    .sort(
      (a, b) =>
        field(a, "Id", isNumber, "a number") -
        field(b, "Id", isNumber, "a number")
    );

  for (const entry of entries) {
    const name = field(entry, "Name", isString, "text");
    if (seen.has(name)) continue;
    seen.add(name);

    const skills = field(entry, "Skills", isObject, "an object");
    const ex = field(skills, "Ex", isObject, "an object");
    const cost = field(ex, "Cost", isNumbers, "a list of costs");
    const text = (key: string) => field(entry, key, isString, "text");
    const tags = [
      ...field(entry, "FavorItemTags", isStrings, "a list of tags"),
      ...field(entry, "FavorItemUniqueTags", isStrings, "a list of tags"),
    ];

    table.push({
      id: field(entry, "Id", isNumber, "a number"),
      name,
      fullName: `${text("FamilyName")} ${text("PersonalName")}`.trim(),
      // Costumes carry theirs in brackets; Shiroko*Terror is her own student.
      lore: !name.includes("("),
      school: localize(localization, "School", text("School"), name),
      role: localize(localization, "TacticRole", text("TacticRole"), name),
      damage: localize(localization, "BulletType", text("BulletType"), name),
      defense: localize(localization, "ArmorType", text("ArmorType"), name),
      weapon: text("WeaponType"),
      // Level 1, what the student list shows and players quote; a few
      // students' EX gets cheaper at level 5.
      exCost: cost[0],
      order: field(entry, "DefaultOrder", isNumber, "a number"),
      height: parseHeight(text("CharHeightMetric")),
      birthday: parseBirthday(text("BirthDay")),
      year: schoolYear(text("SchoolYear")),
      club: localize(localization, "Club", text("Club"), name),
      gifts: favouriteGifts(tags, gifts),
    });
  }

  return table.sort((a, b) => a.order - b.order || a.id - b.id);
}

/** A clue icon: its key in clueIcons.ts and where it comes from. */
export interface ClueIconFile {
  key: string;
  /** Its path under SchaleDB's images. */
  path: string;
  /**
   * For an attack or armour type: SchaleDB's code for it ("Explosion",
   * "LightArmor"), which picks the colour of the circle it's drawn on.
   */
  type?: string;
}

/** Where SchaleDB keeps a school with no icon of its own: ETC, Schale's. */
export const FALLBACK_SCHOOL_ICON = "schoolicon/ETC.png";

/**
 * The icons for the table's cells, for every school, role, attack type,
 * armour type and gift the student table uses: "school/Red Winter" is
 * SchaleDB's schoolicon/RedWinter. Keyed by the name the table shows, so the
 * game looks them up by value. A type the game adds later comes in by
 * itself, with the sword or the shield.
 */
export function clueIconFiles(
  students: unknown,
  localization: unknown,
  items: unknown,
  table: Student[]
): ClueIconFile[] {
  if (!isObject(localization)) {
    throw new FormatError("localization.json is not an object");
  }
  const files = new Map<string, ClueIconFile>();
  const used = new Set(
    table.flatMap((student) => [
      `school/${student.school}`,
      `role/${student.role}`,
      `damage/${student.damage}`,
      `defense/${student.defense}`,
      ...student.gifts.map((gift) => `gift/${gift}`),
    ])
  );

  const kinds = [
    ["school", "School", (code: string) => `schoolicon/${code}.png`, false],
    ["role", "TacticRole", (code: string) => `ui/Role_${code}.png`, false],
    ["damage", "BulletType", () => "ui/Type_Attack.png", true],
    ["defense", "ArmorType", () => "ui/Type_Defense.png", true],
  ] as const;

  for (const entry of entriesOf(students, "students.json")) {
    const name = typeof entry.Name === "string" ? entry.Name : "an entry";
    for (const [kind, names, pathOf, isType] of kinds) {
      const code = entry[names];
      if (!isString(code)) continue;
      const key = `${kind}/${localize(localization, names, code, name)}`;
      if (!used.has(key)) continue;
      files.set(key, {
        key,
        path: pathOf(code),
        ...(isType ? { type: code } : {}),
      });
    }
  }
  for (const gift of ssrGifts(items)) {
    const key = `gift/${gift.name}`;
    if (used.has(key)) {
      files.set(key, { key, path: `item/icon/${gift.icon}.webp` });
    }
  }

  return [...files.values()].sort((a, b) => a.key.localeCompare(b.key));
}
