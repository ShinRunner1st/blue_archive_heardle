import { songs } from "../constants";
import { dailyOrder } from "../constants/dailyOrder";
import { DAILY_EPOCH } from "../constants/game";
import { Song } from "../types/song";

const MS_PER_DAY = 86_400_000;

/** Midnight at the start of the given date, in the player's own timezone. */
function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function epochDate(): Date {
  const [year, month, day] = DAILY_EPOCH.split("-").map(Number);
  return new Date(year, month - 1, day);
}

/**
 * The puzzle number for a date: 1 on the launch day, counting local calendar
 * days. Both ends are snapped to local midnight and the division is rounded
 * rather than floored, so a daylight-saving shift can't drop or add a day.
 *
 * Never below 1: a player whose calendar hasn't reached the launch day yet,
 * behind the launch timezone, plays puzzle #1 early rather than a #0.
 */
export function dayNumber(now: Date = new Date()): number {
  const elapsed = startOfDay(now).getTime() - epochDate().getTime();
  return Math.max(1, Math.round(elapsed / MS_PER_DAY) + 1);
}

const byThemeNo = new Map(songs.map((song) => [song.themeNo, song]));

/**
 * The track for a given puzzle number. Stable for all players, forever.
 *
 * The order is read from a checked-in schedule rather than shuffled here. A
 * runtime shuffle is a function of the song list's length, so adding a single
 * song reshuffled 340 of 341 days - today's track would change mid-deploy and
 * two players on the same day would see different songs. The schedule is only
 * ever appended to, so adding songs cannot disturb a day already played.
 */
export function dailySong(day: number): Song {
  // Handles a clock set before the epoch, which would otherwise index from the
  // wrong end of the schedule.
  const index =
    (((day - 1) % dailyOrder.length) + dailyOrder.length) % dailyOrder.length;

  const song = byThemeNo.get(dailyOrder[index]);
  if (song) return song;

  // The scheduled theme has left the song list. Its slot stays put so the rest
  // of the schedule does not shift; only this one day falls back.
  return songs[index % songs.length];
}

/** The local calendar date of a puzzle number: the reverse of dayNumber. */
export function dateOfDay(day: number): Date {
  const epoch = epochDate();
  return new Date(
    epoch.getFullYear(),
    epoch.getMonth(),
    epoch.getDate() + day - 1
  );
}

/** Milliseconds from `now` until the next local midnight. */
export function msUntilNextDay(now: Date = new Date()): number {
  const tomorrow = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1
  );

  return tomorrow.getTime() - now.getTime();
}

/** Renders a countdown as "5h 12m", dropping the hours once they run out. */
export function formatCountdown(ms: number): string {
  if (ms <= 0) return "any moment now";

  const totalMinutes = Math.floor(ms / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m`;
  return "less than a minute";
}
