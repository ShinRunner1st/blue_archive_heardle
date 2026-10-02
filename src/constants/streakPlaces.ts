import { bundledPicture, PAGE_PICTURES } from "./pagePictures";

/**
 * A place the background moves to once the endless win streak reaches
 * `wins`: a day picture for the light scheme and a night one for the dark.
 */
export interface StreakPlace {
  wins: number;
  name: string;
  day: string;
  night: string;
}

/** Where the background sits below the first place: the scheme's own. */
export const HOME_PLACE = PAGE_PICTURES.home.name;

/**
 * A tour of Kivotos, one school at a time, ending above it all
 * (page-pictures.json). Pictures come from the game's scenario backgrounds,
 * blurred and dimmed like the default.
 */
export const STREAK_PLACES: StreakPlace[] = PAGE_PICTURES.places.map(
  (place) => ({
    ...place,
    day: bundledPicture(place.day),
    night: bundledPicture(place.night),
  })
);
