import { SERVER_KEY } from "../constants/game";
import { isServer, Server } from "../types/server";

/**
 * The server the student games follow, read from storage lazily: Global to
 * begin with. The save functions read it to pick JP's keys (see storage.ts),
 * so this module reads localStorage itself rather than through them.
 */
let server: Server | null = null;

const listeners = new Set<() => void>();

function read(): Server {
  try {
    const stored = localStorage.getItem(SERVER_KEY);
    return isServer(stored) ? stored : "global";
  } catch {
    return "global";
  }
}

export function getServer(): Server {
  if (server === null) server = read();
  return server;
}

/**
 * Switches server. The app starts its student games over from the new
 * server's saves (see index.tsx), since every pool and history changes.
 */
export function setServer(next: Server): void {
  if (next === getServer()) return;
  server = next;
  try {
    localStorage.setItem(SERVER_KEY, next);
  } catch {
    // Storage unavailable: the switch holds until the page reloads.
  }
  listeners.forEach((listener) => listener());
}

export function subscribeServer(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Forgets the cached server, for tests. */
export function resetServerState(): void {
  server = null;
}

/**
 * " (JP)" after a student game's name in its share texts on the JP server,
 * where the daily puzzles differ from Global's; nothing on Global, as before.
 */
export function serverSuffix(): string {
  return getServer() === "jp" ? " (JP)" : "";
}

/** A share picture's tag, "VOICE · DAILY #3 · JP" on the JP server. */
export function withServerTag(tag: string): string {
  return getServer() === "jp" ? `${tag} · JP` : tag;
}

const REOPEN_KEY = "reopenSettings";

/**
 * Switches server from Settings: the app starts over on the new server (see
 * index.tsx), so Settings is marked to open again straight away.
 */
export function setServerFromSettings(next: Server): void {
  try {
    sessionStorage.setItem(REOPEN_KEY, "1");
  } catch {
    // Settings just closes, then.
  }
  setServer(next);
}

/** Whether Settings should open as the app starts: once, after a switch. */
export function takeReopenSettings(): boolean {
  try {
    const reopen = sessionStorage.getItem(REOPEN_KEY) === "1";
    sessionStorage.removeItem(REOPEN_KEY);
    return reopen;
  } catch {
    return false;
  }
}
