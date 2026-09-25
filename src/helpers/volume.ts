import { DEFAULT_VOLUME } from "../constants/game";
import { loadVolume, saveVolume } from "./storage";

/**
 * The one volume every player in the app follows. Held here rather than in
 * component state so the clip player and the result card stay in step, and
 * read from storage lazily so a returning player gets their own level back.
 */
let volume: number | null = null;
/** What unmuting goes back to. */
let lastAudible: number = DEFAULT_VOLUME;

const listeners = new Set<() => void>();

function clamp(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_VOLUME;
  return Math.min(Math.max(value, 0), 1);
}

export function getVolume(): number {
  if (volume === null) {
    volume = loadVolume();
    if (volume > 0) lastAudible = volume;
  }
  return volume;
}

export function setVolume(next: number): void {
  const value = clamp(next);
  if (value === volume) return;

  volume = value;
  if (value > 0) lastAudible = value;
  saveVolume(value);
  listeners.forEach((listener) => listener());
}

/** Mutes, or brings back the level the player had before muting. */
export function toggleMute(): void {
  setVolume(getVolume() > 0 ? 0 : lastAudible);
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
  volume = null;
  lastAudible = DEFAULT_VOLUME;
  settable = null;
}
