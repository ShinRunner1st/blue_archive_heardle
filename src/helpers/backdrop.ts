import { StreakPlace } from "../constants/streakPlaces";
import { ColorScheme } from "../constants/theme";

/**
 * The picture behind the page: the place the streak has reached, by day or by
 * night to match the scheme, or the scheme's own picture below the first
 * place. The result picture uses the same one.
 */
export function backdropSrc(
  place: StreakPlace | null,
  scheme: ColorScheme,
  schemePicture: string
): string {
  if (!place) return schemePicture;
  return scheme === "dark" ? place.night : place.day;
}
