import abydosDay from "../image/backgrounds/010-abydos-station-day.webp";
import abydosNight from "../image/backgrounds/010-abydos-station-night.webp";
import millenniumDay from "../image/backgrounds/020-millennium-campus-day.webp";
import millenniumNight from "../image/backgrounds/020-millennium-campus-night.webp";
import gehennaDay from "../image/backgrounds/030-gehenna-streets-day.webp";
import gehennaNight from "../image/backgrounds/030-gehenna-streets-night.webp";
import hyakkiyakoDay from "../image/backgrounds/040-hyakkiyako-lantern-road-day.webp";
import hyakkiyakoNight from "../image/backgrounds/040-hyakkiyako-lantern-road-night.webp";
import shanhaijingDay from "../image/backgrounds/050-shanhaijing-gate-day.webp";
import shanhaijingNight from "../image/backgrounds/050-shanhaijing-gate-night.webp";
import redWinterDay from "../image/backgrounds/060-red-winter-campus-day.webp";
import redWinterNight from "../image/backgrounds/060-red-winter-campus-night.webp";
import wildhuntDay from "../image/backgrounds/070-wildhunt-plaza-day.webp";
import wildhuntNight from "../image/backgrounds/070-wildhunt-plaza-night.webp";
import trinityDay from "../image/backgrounds/080-trinity-cathedral-plaza-day.webp";
import trinityNight from "../image/backgrounds/080-trinity-cathedral-plaza-night.webp";
import eriduDay from "../image/backgrounds/090-eridu-skyline-day.webp";
import eriduNight from "../image/backgrounds/090-eridu-skyline-night.webp";
import skyDay from "../image/backgrounds/100-above-kivotos-day.webp";
import skyNight from "../image/backgrounds/100-above-kivotos-night.webp";

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
export const HOME_PLACE = "the Trinity library";

/**
 * A tour of Kivotos, one school at a time, ending above it all. Pictures come
 * from the game's scenario backgrounds, blurred and dimmed like the default.
 */
export const STREAK_PLACES: StreakPlace[] = [
  { wins: 10, name: "Abydos Station", day: abydosDay, night: abydosNight },
  {
    wins: 20,
    name: "Millennium Campus",
    day: millenniumDay,
    night: millenniumNight,
  },
  { wins: 30, name: "Gehenna Streets", day: gehennaDay, night: gehennaNight },
  {
    wins: 40,
    name: "Hyakkiyako Lantern Road",
    day: hyakkiyakoDay,
    night: hyakkiyakoNight,
  },
  {
    wins: 50,
    name: "Shanhaijing Gate",
    day: shanhaijingDay,
    night: shanhaijingNight,
  },
  {
    wins: 60,
    name: "Red Winter Campus",
    day: redWinterDay,
    night: redWinterNight,
  },
  { wins: 70, name: "Wildhunt Plaza", day: wildhuntDay, night: wildhuntNight },
  {
    wins: 80,
    name: "Trinity Cathedral Plaza",
    day: trinityDay,
    night: trinityNight,
  },
  { wins: 90, name: "Eridu Skyline", day: eriduDay, night: eriduNight },
  { wins: 100, name: "Above Kivotos", day: skyDay, night: skyNight },
];
