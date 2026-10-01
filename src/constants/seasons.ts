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
 * The seasons, by date: holidays, Blue Archive's two anniversaries and a
 * few times of year, with the library between them. Pictures come from the
 * game's scenario backgrounds, made with scripts/make-backdrop.mjs like the
 * streak places. A season may run over New Year's Eve; seasons must not
 * overlap.
 */
export const SEASONS: Season[] = [
  {
    // JP opened on 4 February 2021.
    id: "jp-anniversary",
    home: "the anniversary fair",
    from: [2, 1],
    to: [2, 7],
    day: "seasons/anniversary-day",
    night: "seasons/anniversary-night",
  },
  {
    id: "valentine",
    home: "the dessert café",
    from: [2, 8],
    to: [2, 14],
    day: "seasons/valentine-day",
    night: "seasons/valentine-night",
  },
  {
    id: "cherry-blossom",
    home: "the cherry blossoms",
    from: [3, 25],
    to: [4, 10],
    day: "seasons/cherry-blossom-day",
    night: "seasons/cherry-blossom-night",
  },
  {
    id: "beach",
    home: "the beach festival",
    from: [7, 15],
    to: [8, 10],
    day: "seasons/beach-day",
    night: "seasons/beach-night",
  },
  {
    id: "summer-festival",
    home: "the summer festival",
    from: [8, 11],
    to: [8, 25],
    day: "seasons/summer-festival-day",
    night: "seasons/summer-festival-night",
  },
  {
    // Night by day too: Halloween is an evening out.
    id: "halloween",
    home: "the night carnival",
    from: [10, 24],
    to: [10, 31],
    day: "seasons/halloween-day",
    night: "seasons/halloween-night",
  },
  {
    // Global opened on 8 November 2021.
    id: "global-anniversary",
    home: "the anniversary fair",
    from: [11, 4],
    to: [11, 12],
    day: "seasons/anniversary-day",
    night: "seasons/anniversary-night",
  },
  {
    id: "autumn",
    home: "the autumn woods",
    from: [11, 13],
    to: [11, 30],
    day: "seasons/autumn-day",
    night: "seasons/autumn-night",
  },
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
