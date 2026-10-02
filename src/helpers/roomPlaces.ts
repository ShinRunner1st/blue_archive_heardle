/** What a place is worked out from: a player's right answers and their time. */
export interface Placed {
  id: string;
  score: number;
  time: number;
}

/**
 * Each player's place: most right first, the faster over those right
 * breaking a tie, and a tie on both sharing the place (1, 2, 2, 4). The
 * page's standings (roomView.ts) and the room's receipts (room.ts) both
 * use it, so a receipt's place is the one the standings show.
 */
export function places(players: readonly Placed[]): Map<string, number> {
  const ahead = (a: Placed, b: Placed) =>
    a.score > b.score || (a.score === b.score && a.time < b.time);
  return new Map(
    players.map((player) => [
      player.id,
      1 + players.filter((other) => ahead(other, player)).length,
    ])
  );
}
