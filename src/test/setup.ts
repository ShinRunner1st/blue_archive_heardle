import { beforeEach } from "vitest";

import { COLOR_SCHEME_KEY, VOLUME_KEY } from "../constants/game";
import { resetColorSchemeState } from "../helpers/colorScheme";
import { resetVolumeState } from "../helpers/volume";

// React 19 requires this flag before `act` will run without warning.
declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// Volume and colour scheme are app-wide state, so every test starts as a
// brand-new player.
beforeEach(() => {
  localStorage.removeItem(VOLUME_KEY);
  localStorage.removeItem(COLOR_SCHEME_KEY);
  resetVolumeState();
  resetColorSchemeState();
});
