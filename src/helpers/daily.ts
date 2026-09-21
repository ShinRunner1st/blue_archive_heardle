import { songs } from "../constants";
import { DAILY_EPOCH, DAILY_SEED } from "../constants/game";
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
 */
export function dayNumber(now: Date = new Date()): number {
  const elapsed = startOfDay(now).getTime() - epochDate().getTime();
  return Math.round(elapsed / MS_PER_DAY) + 1;
}

/** Small deterministic PRNG - same seed, same sequence, on every device. */
function mulberry32(seed: number): () => number {
  let state = seed >>> 0;

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * One fixed shuffle of the whole song list, walked a day at a time. Because the
 * order is a permutation rather than a hash, every track comes up exactly once
 * before any repeats - the daily equivalent of the endless bag.
 */
function dailyOrder(): Song[] {
  const random = mulberry32(DAILY_SEED);
  const order = [...songs];

  for (let i = order.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }

  return order;
}

const ORDER = dailyOrder();

/** The track for a given puzzle number. Stable for all players, forever. */
export function dailySong(day: number): Song {
  // Handles a clock set before the epoch, which would otherwise index from the
  // wrong end of the list.
  const index = (((day - 1) % ORDER.length) + ORDER.length) % ORDER.length;
  return ORDER[index];
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
