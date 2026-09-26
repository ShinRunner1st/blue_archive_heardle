import { VOLUMES, Volume } from "../constants/volumes";
import { Round } from "../types/stats";

export interface BadgeProgress {
  volume: Volume;
  /** How many of its songs have been guessed right at least once. */
  found: number;
  total: number;
  done: boolean;
}

/** Every song guessed right at least once, in either mode. */
export function guessedThemes(rounds: Round[]): Set<string> {
  return new Set(
    rounds.filter((round) => round.didGuess).map((r) => r.solution.themeNo)
  );
}

/** Each volume's badge: earned once every one of its songs has been guessed. */
export function badgeProgress(guessed: Set<string>): BadgeProgress[] {
  return VOLUMES.map((volume) => {
    const found = volume.songs.filter((theme) => guessed.has(theme)).length;
    const total = volume.songs.length;
    return { volume, found, total, done: found === total };
  });
}

/**
 * What a right guess of `theme` did for the badges, given the songs guessed
 * before it: a volume completed, or one more song towards one. Nothing for a
 * song guessed before, or one on no volume.
 */
export function badgeNews(theme: string, before: Set<string>): string[] {
  if (before.has(theme)) return [];
  const after = new Set(before).add(theme);

  return badgeProgress(after)
    .filter(({ volume }) => volume.songs.includes(theme))
    .map(({ volume, found, total, done }) =>
      done
        ? `💿 OST Vol.${volume.number} complete! Badge earned.`
        : `💿 New for OST Vol.${volume.number}: ${found} / ${total}`
    );
}
