import React from "react";

import { ColorScheme } from "../constants/theme";
import { getColorScheme, subscribeColorScheme } from "../helpers/colorScheme";

/** The scheme in use, re-rendering whenever it changes. */
export function useColorScheme(): ColorScheme {
  return React.useSyncExternalStore(subscribeColorScheme, getColorScheme);
}
