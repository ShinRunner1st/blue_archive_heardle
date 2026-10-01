import { ProfileSummary } from "../types/account";
import { profileStats, ProfileStats } from "./profileStats";
import { getServer } from "./server";

/**
 * The profile's totals for the account (docs/accounts.md, section 3):
 * worked out from this browser's saves, the source of truth, and sent as a
 * cache for other players to see later. Only ever made from the progress,
 * never the other way: nothing reads a summary back.
 */
export function profileSummary(
  stats: ProfileStats = profileStats(undefined, getServer())
): ProfileSummary {
  return {
    roundsPlayed: stats.roundsPlayed,
    daysPlayed: stats.daysPlayed,
    dailiesWon: stats.dailiesWon,
    bestDailyStreak: stats.bestDailyStreak,
    bestWinStreak: stats.bestWinStreak,
    songsGuessed: stats.songsGuessed,
    studentsFound: stats.studentsFound,
    missionsCleared: stats.missionsCleared,
    badgesEarned: stats.badgesEarned,
    roomGames: stats.room.games,
    roomWins: stats.room.wins,
    server: getServer(),
  };
}
