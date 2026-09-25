import { beforeEach } from "vitest";

import { VOLUME_KEY } from "../constants/game";
import { resetVolumeState } from "../helpers/volume";

// React 19 requires this flag before `act` will run without warning.
declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// The volume is app-wide state, so every test starts as a brand-new player.
beforeEach(() => {
  localStorage.removeItem(VOLUME_KEY);
  resetVolumeState();
});
