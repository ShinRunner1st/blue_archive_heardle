import seasonData from "../content/seasons.json";

/** A calendar date, month first (1-12), then day. */
export type MonthDay = [month: number, day: number];

/**
 * A time of year that dresses the home background up, in place of the
 * Trinity library: a day picture for the light scheme and a night one for
 * the dark. Streak places still take over from 10 wins.
 */
export interface Season {
  id: string;
  /** Where a lost streak sends the background, for the result screen. */
  home: string;
  /** First and last day, both included, in the player's own time. */
  from: MonthDay;
  to: MonthDay;
  /** Keys in pictureFiles, served from the Worker. */
  day: string;
  night: string;
}

/** A season as src/content/seasons.json writes it. */
export interface SeasonEntry {
  id: string;
  home: string;
  from: MonthDay;
  to: MonthDay;
  /**
   * The pictures' name in pictures/seasons/, when it isn't the id: the two
   * anniversaries share theirs.
   */
  pictures?: string;
  /** The game's backgrounds the pictures are made from (make-seasons). */
  scene: { day: string; night: string };
}

/**
 * The seasons, from src/content/seasons.json: add or remove one there, then
 * `npm run seasons` makes its pictures and `npm run songs` puts them on the
 * Worker. Seasons must not overlap (the content test checks).
 */
export const SEASONS: Season[] = (seasonData as unknown as SeasonEntry[]).map(
  ({ id, home, from, to, pictures = id }) => ({
    id,
    home,
    from,
    to,
    day: `seasons/${pictures}-day`,
    night: `seasons/${pictures}-night`,
  })
);
