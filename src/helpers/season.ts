import { pictureFiles } from "../constants/pictureFiles";
import { MonthDay, Season, SEASONS } from "../constants/seasons";
import { HOME_PLACE } from "../constants/streakPlaces";
import { ColorScheme } from "../constants/theme";
import { audioBaseUrl } from "./audioUrl";

/** A date as one number that sorts through the year: 1231 for 31 December. */
const ordinal = ([month, day]: MonthDay) => month * 100 + day;

/** Whether `date` falls in the season, including one that crosses New Year. */
function isIn(season: Season, date: Date): boolean {
  const today = ordinal([date.getMonth() + 1, date.getDate()]);
  const from = ordinal(season.from);
  const to = ordinal(season.to);
  return from <= to
    ? today >= from && today <= to
    : today >= from || today <= to;
}

/**
 * The season on the player's own calendar, if any. In development,
 * `?season=<id>` shows one on any day, to check how it looks.
 */
export function seasonOn(date: Date = new Date()): Season | null {
  if (import.meta.env.DEV) {
    const forced = new URLSearchParams(window.location.search).get("season");
    const season = SEASONS.find(({ id }) => id === forced);
    if (season) return season;
  }
  return SEASONS.find((season) => isIn(season, date)) ?? null;
}

/** A picture on the Worker, by its key in pictureFiles. */
export function pictureUrl(key: string): string {
  return `${audioBaseUrl()}/${pictureFiles[key]}`;
}

/**
 * The picture behind the page below the first streak place: the season's,
 * by day or by night, or the scheme's own library.
 */
export function homePicture(
  season: Season | null,
  scheme: ColorScheme,
  schemePicture: string
): string {
  if (!season) return schemePicture;
  return pictureUrl(scheme === "dark" ? season.night : season.day);
}

/** Where a lost streak sends the background. */
export function homeName(season: Season | null): string {
  return season?.home ?? HOME_PLACE;
}
