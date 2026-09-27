import { StreakPlace } from "../constants/streakPlaces";
import { ColorScheme } from "../constants/theme";

/**
 * The picture behind the page: the place the streak has reached, by day or by
 * night to match the scheme, or the home picture below the first place (the
 * scheme's own, or the season's; see homePicture). The result picture uses
 * the same one.
 */
export function backdropSrc(
  place: StreakPlace | null,
  scheme: ColorScheme,
  home: string
): string {
  if (!place) return home;
  return scheme === "dark" ? place.night : place.day;
}
