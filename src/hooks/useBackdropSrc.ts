import { useTheme } from "styled-components";

import { backdropSrc } from "../helpers/backdrop";
import { homePicture } from "../helpers/season";
import { placeFor } from "../helpers/winStreak";
import { useColorScheme } from "./useColorScheme";
import { useSeason } from "./useSeason";

/** The picture behind the page for a run of `wins`, for pictures to sit on. */
export function useBackdropSrc(wins: number): string {
  const theme = useTheme();
  const scheme = useColorScheme();
  const home = homePicture(useSeason(), scheme, theme.backgroundImage);
  return backdropSrc(placeFor(wins), scheme, home);
}
