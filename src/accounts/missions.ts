import missionData from "../content/missions.json";
import { Db } from "./store";

/**
 * The missions the account has cleared (docs/accounts.md, step 4): rows a
 * room pass reads to know which cosmetics the account has unlocked. The
 * page works its missions out from its saves, as ever, and sends the ids
 * with the profile when they change; a mission is only ever added.
 */

const KNOWN = new Set(missionData.missions.map(({ id }) => id));

/** The ids a page sent: known missions only, each once. */
export function cleanMissions(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [
    ...new Set(
      value.filter(
        (id): id is string => typeof id === "string" && KNOWN.has(id)
      )
    ),
  ];
}

/**
 * Adds the missions the account doesn't have yet: the ones it has are read
 * first (a few rows), so a page sending the same list again writes nothing.
 */
export async function addMissions(
  db: Db,
  account: string,
  missions: string[],
  now: number
): Promise<void> {
  if (missions.length === 0) return;
  const { results } = await db
    .prepare("SELECT mission FROM missions_cleared WHERE account_id = ?")
    .bind(account)
    .all<{ mission: string }>();
  const kept = new Set(results.map(({ mission }) => mission));
  const added = missions.filter((id) => !kept.has(id));
  if (added.length === 0) return;
  await db.batch(
    added.map((mission) =>
      db
        .prepare(
          `INSERT INTO missions_cleared (account_id, mission, cleared_at)
           VALUES (?, ?, ?) ON CONFLICT DO NOTHING`
        )
        .bind(account, mission, now)
    )
  );
}
