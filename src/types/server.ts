/**
 * Which server's students the student games follow: Global's, or JP's, which
 * is a few months ahead. Each is its own pool, with its own daily schedule,
 * rounds and stats. The OST follows the JP tracklist either way.
 */
export type Server = "global" | "jp";

export const SERVERS: Server[] = ["global", "jp"];

export const SERVER_NAMES: Record<Server, string> = {
  global: "Global",
  jp: "JP",
};

export function isServer(value: unknown): value is Server {
  return SERVERS.includes(value as Server);
}
