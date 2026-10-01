import { DEFAULT_VOLUME } from "../constants/game";
import { loadVolume, saveVolume, VolumeChannel } from "./storage";

export type { VolumeChannel } from "./storage";

/**
 * The volumes the app plays at: one every game's player follows, and the
 * Jukebox's own. Held here rather than in component state so the clip player
 * and the result card stay in step, and read from storage lazily so a
 * returning player gets their own levels back.
 */
interface Level {
  volume: number | null;
  /** What unmuting goes back to. */
  lastAudible: number;
}

const fresh = (): Record<VolumeChannel, Level> => ({
  game: { volume: null, lastAudible: DEFAULT_VOLUME },
  jukebox: { volume: null, lastAudible: DEFAULT_VOLUME },
});
let levels = fresh();

const listeners = new Set<() => void>();

function clamp(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_VOLUME;
  return Math.min(Math.max(value, 0), 1);
}

export function getVolume(channel: VolumeChannel = "game"): number {
  const level = levels[channel];
  if (level.volume === null) {
    level.volume = loadVolume(channel);
    if (level.volume > 0) level.lastAudible = level.volume;
  }
  return level.volume;
}

export function setVolume(next: number, channel: VolumeChannel = "game"): void {
  const value = clamp(next);
  const level = levels[channel];
  if (value === level.volume) return;

  level.volume = value;
  if (value > 0) level.lastAudible = value;
  saveVolume(value, channel);
  listeners.forEach((listener) => listener());
}

/** Mutes, or brings back the level the player had before muting. */
export function toggleMute(channel: VolumeChannel = "game"): void {
  setVolume(getVolume(channel) > 0 ? 0 : levels[channel].lastAudible, channel);
}

export function subscribeVolume(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

let settable: boolean | null = null;

/**
 * iOS ignores `volume` set from script - only the hardware buttons change it -
 * and reads it back as 1. A slider there would move without doing anything,
 * so callers hide it when this is false.
 */
export function canSetVolume(): boolean {
  if (settable === null) {
    try {
      const probe = document.createElement("audio");
      probe.volume = 0.5;
      settable = probe.volume === 0.5;
    } catch {
      settable = false;
    }
  }
  return settable;
}

/** Test seam - this is module state that would otherwise leak across tests. */
export function resetVolumeState(): void {
  levels = fresh();
  settable = null;
}
