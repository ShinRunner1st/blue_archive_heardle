/**
 * What every saved round carries besides its game: an id, so two copies of
 * the same progress merge without doubling or losing a round, and when it
 * was dealt. Both are absent from rounds saved before save format 2 until
 * they're given one (see helpers/roundId.ts).
 */
export interface RoundStamp {
  /** 12 characters: random hex, or "l" and 11 hex for a round from before ids. */
  id?: string;
  /** When the round was dealt, in epoch milliseconds; absent from before ids. */
  at?: number;
}
