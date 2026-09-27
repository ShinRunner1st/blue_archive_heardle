import { useTheme } from "styled-components";

import { backdropSrc } from "../helpers/backdrop";
import { placeFor } from "../helpers/winStreak";
import { useColorScheme } from "./useColorScheme";

/** The picture behind the page for a run of `wins`, for pictures to sit on. */
export function useBackdropSrc(wins: number): string {
  const theme = useTheme();
  const scheme = useColorScheme();
  return backdropSrc(placeFor(wins), scheme, theme.backgroundImage);
}
