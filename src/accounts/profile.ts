import cosmetics from "../content/cosmetics.json";
import {
  AccountProfile,
  ProfileSummary,
  SUMMARY_FIELDS,
} from "../types/account";
import { Db } from "./store";

/**
 * The profile in the account (docs/accounts.md, step 2): checked as it
 * comes in, so the account only ever holds a name of the right shape, a
 * student id, cosmetics that exist, and a summary of numbers.
 */

/** As long as a name may be on the page (MAX_PLAYER_NAME). */
const MAX_NAME = 20;

/**
 * Control and invisible characters, which could make one name look like
 * another or break a card, as the rooms take them out of names.
 */
const INVISIBLE =
  /[\p{Cc}\p{Cf}\p{Co}\p{Cs}\p{Zl}\p{Zp}\u115f\u1160\u2800\u3164\uffa0]/gu;

export function cleanProfileName(value: unknown): string {
  if (typeof value !== "string") return "";
  return value
    .normalize("NFC")
    .replace(INVISIBLE, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_NAME)
    .trim();
}

/** Each kind's ids, the first its default, from the content file itself. */
const IDS = {
  title: cosmetics.titles.map((item) => item.id),
  banner: cosmetics.banners.map((item) => item.id),
  frame: cosmetics.frames.map((item) => item.id),
  background: cosmetics.backgrounds.map((item) => item.id),
  cardColors: cosmetics.cardColors.map((item) => item.id),
};

const pickOf = (kind: keyof typeof IDS, value: unknown) =>
  typeof value === "string" && IDS[kind].includes(value) ? value : IDS[kind][0];

/** The profile a page sent, made whole: anything wrong is its default. */
export function cleanProfile(
  value: unknown,
  now: number
): AccountProfile & { summary: ProfileSummary } {
  const body =
    typeof value === "object" && value !== null
      ? (value as Record<string, unknown>)
      : {};
  const student = body.student;
  const editedAt = body.editedAt;
  return {
    name: cleanProfileName(body.name),
    sensei: body.sensei !== false,
    student:
      typeof student === "number" &&
      Number.isSafeInteger(student) &&
      student > 0
        ? student
        : null,
    title: pickOf("title", body.title),
    banner: pickOf("banner", body.banner),
    frame: pickOf("frame", body.frame),
    background: pickOf("background", body.background),
    cardColors: pickOf("cardColors", body.cardColors),
    // A page's clock can be off; never later than the Worker's day ahead.
    editedAt:
      typeof editedAt === "number" &&
      Number.isSafeInteger(editedAt) &&
      editedAt >= 0
        ? Math.min(editedAt, now + 24 * 60 * 60_000)
        : now,
    summary: cleanSummary(body.summary),
  };
}

/** Numbers only, whole and not negative, of the fields it has. */
export function cleanSummary(value: unknown): ProfileSummary {
  const body =
    typeof value === "object" && value !== null
      ? (value as Record<string, unknown>)
      : {};
  const numbers = Object.fromEntries(
    SUMMARY_FIELDS.map((field) => {
      const number = body[field];
      return [
        field,
        typeof number === "number" &&
        Number.isSafeInteger(number) &&
        number >= 0
          ? number
          : 0,
      ];
    })
  ) as Record<(typeof SUMMARY_FIELDS)[number], number>;
  return { ...numbers, server: body.server === "jp" ? "jp" : "global" };
}

interface ProfileRow {
  name: string;
  sensei: number;
  student: number | null;
  title: string;
  banner: string;
  frame: string;
  background: string;
  card_colors: string;
  edited_at: number;
}

/** The account's profile, or null before it has one. Not its summary. */
export async function readProfile(
  db: Db,
  account: string
): Promise<AccountProfile | null> {
  const row = await db
    .prepare(
      `SELECT name, sensei, student, title, banner, frame, background,
              card_colors, edited_at
       FROM profiles WHERE account_id = ?`
    )
    .bind(account)
    .first<ProfileRow>();
  if (!row) return null;
  return {
    name: row.name,
    sensei: row.sensei === 1,
    student: row.student,
    title: row.title,
    banner: row.banner,
    frame: row.frame,
    background: row.background,
    cardColors: row.card_colors,
    editedAt: row.edited_at,
  };
}

/**
 * Writes the profile, one row: the picks only if they were changed at
 * least as late as the ones kept (a page with an older change can't undo a
 * newer one from another device), the summary always, as it's only ever a
 * fresh copy of the progress's totals. Gives back the profile as kept.
 */
export async function writeProfile(
  db: Db,
  account: string,
  profile: AccountProfile & { summary: ProfileSummary },
  now: number
): Promise<AccountProfile> {
  const newer = "excluded.edited_at >= profiles.edited_at";
  const keep = (column: string) =>
    `${column} = CASE WHEN ${newer} THEN excluded.${column} ELSE profiles.${column} END`;
  await db
    .prepare(
      `INSERT INTO profiles (account_id, name, sensei, student, title, banner,
         frame, background, card_colors, summary, edited_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (account_id) DO UPDATE SET
         ${[
           "name",
           "sensei",
           "student",
           "title",
           "banner",
           "frame",
           "background",
           "card_colors",
         ]
           .map(keep)
           .join(", ")},
         edited_at = MAX(excluded.edited_at, profiles.edited_at),
         summary = excluded.summary,
         updated_at = excluded.updated_at`
    )
    .bind(
      account,
      profile.name,
      profile.sensei ? 1 : 0,
      profile.student,
      profile.title,
      profile.banner,
      profile.frame,
      profile.background,
      profile.cardColors,
      JSON.stringify(profile.summary),
      profile.editedAt,
      now
    )
    .run();
  return (await readProfile(db, account))!;
}
