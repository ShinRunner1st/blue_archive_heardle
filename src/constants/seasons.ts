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

/**
 * The seasons, by date. Pictures come from the game's scenario backgrounds,
 * made with scripts/make-backdrop.mjs like the streak places. A season may
 * run over New Year's Eve; seasons must not overlap.
 */
export const SEASONS: Season[] = [
  {
    id: "christmas",
    home: "the Christmas lodge",
    from: [12, 18],
    to: [12, 26],
    day: "seasons/christmas-day",
    night: "seasons/christmas-night",
  },
  {
    id: "new-year",
    home: "the New Year shrine",
    from: [12, 31],
    to: [1, 7],
    day: "seasons/new-year-day",
    night: "seasons/new-year-night",
  },
];
