import { beforeEach } from "vitest";

import {
  CHARACTER_KEY,
  COLOR_SCHEME_KEY,
  CUSTOM_CURSOR_KEY,
  PLAYER_NAME_KEY,
  SENSEI_TITLE_KEY,
  SERVER_KEY,
  VOLUME_KEY,
} from "../constants/game";
import { resetPlayerNameState } from "../helpers/playerName";
import { resetCharacterChoiceState } from "../helpers/characterChoice";
import { resetColorSchemeState } from "../helpers/colorScheme";
import { resetCustomCursorState } from "../helpers/customCursor";
import { resetServerState } from "../helpers/server";
import { resetVolumeState } from "../helpers/volume";

// React 19 requires this flag before `act` will run without warning.
declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// Volume, colour scheme, cursor and character are app-wide state, so every test starts
// as a brand-new player.
// The accounts Worker's tests run in Node, with no browser storage.
beforeEach(() => {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(VOLUME_KEY);
  localStorage.removeItem(COLOR_SCHEME_KEY);
  localStorage.removeItem(CUSTOM_CURSOR_KEY);
  localStorage.removeItem(CHARACTER_KEY);
  localStorage.removeItem(PLAYER_NAME_KEY);
  localStorage.removeItem(SENSEI_TITLE_KEY);
  localStorage.removeItem(SERVER_KEY);
  resetPlayerNameState();
  resetVolumeState();
  resetColorSchemeState();
  resetCustomCursorState();
  resetCharacterChoiceState();
  resetServerState();
});
