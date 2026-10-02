import { ProfileSummary, ProfileViewAnswer } from "../types/account";
import { Db } from "./store";
import { readVerifiedTotals } from "./verified";

/**
 * Profiles from a card (docs/room-profiles.md): a player in a room taps a
 * signed-in player's card; the room, which has that player's public id from
 * their pass, signs a short-lived ticket for it and hands it only to the
 * one who asked; the page brings it here for the profile. So pages never
 * learn a public id, nobody needs a session to look (guests can), and a
 * ticket only works for a few minutes, for what anyone in that room could
 * see.
 *
 * The ticket is profileTicket.ts's, apart, as the rooms Worker bundles it.
 */

/** The summary as kept: the page's cache of its saves, or null. */
function summaryOf(text: string | undefined): ProfileSummary | null {
  if (!text) return null;
  try {
    const value: unknown = JSON.parse(text);
    return typeof value === "object" && value !== null
      ? (value as ProfileSummary)
      : null;
  } catch {
    return null;
  }
}

/**
 * The profile another player sees, by public id; null for none, or one
 * its player has hidden. Reads the account by its public id (unique, so
 * one row), the profile's summary, and the verified summary rows: no
 * current streaks, nothing closed or written, no session.
 */
export async function readProfileView(
  db: Db,
  publicId: string
): Promise<ProfileViewAnswer | null> {
  const row = await db
    .prepare("SELECT id, profile_shown FROM accounts WHERE public_id = ?")
    .bind(publicId)
    .first<{ id: string; profile_shown: number }>();
  if (!row || row.profile_shown !== 1) return null;
  const profile = await db
    .prepare("SELECT summary FROM profiles WHERE account_id = ?")
    .bind(row.id)
    .first<{ summary: string }>();
  return {
    summary: summaryOf(profile?.summary),
    verified: await readVerifiedTotals(db, row.id),
  };
}

/** The Account tab's switch: whether players in a room may see it. */
export async function setProfileShown(
  db: Db,
  account: string,
  shown: boolean
): Promise<void> {
  await db
    .prepare("UPDATE accounts SET profile_shown = ? WHERE id = ?")
    .bind(shown ? 1 : 0, account)
    .run();
}
