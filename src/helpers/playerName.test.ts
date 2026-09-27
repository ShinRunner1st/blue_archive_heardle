import { describe, expect, it, vi } from "vitest";

import { PLAYER_NAME_KEY } from "../constants/game";
import {
  getPlayerName,
  MAX_PLAYER_NAME,
  resetPlayerNameState,
  setPlayerName,
  subscribePlayerName,
} from "./playerName";

describe("the player name", () => {
  it("is empty until given, then remembered", () => {
    expect(getPlayerName()).toBe("");

    setPlayerName("Shiroko");
    resetPlayerNameState();

    expect(getPlayerName()).toBe("Shiroko");
    expect(localStorage.getItem(PLAYER_NAME_KEY)).toBe("Shiroko");
  });

  it("keeps spaces while typing but not past its length", () => {
    setPlayerName("Shiro ");
    expect(getPlayerName()).toBe("Shiro ");

    setPlayerName("x".repeat(40));
    expect(getPlayerName()).toHaveLength(MAX_PLAYER_NAME);
  });

  it("forgets a blank name", () => {
    setPlayerName("Hina");
    setPlayerName("  ");

    expect(localStorage.getItem(PLAYER_NAME_KEY)).toBeNull();
  });

  it("tells listeners when it changes", () => {
    const listener = vi.fn();
    const stop = subscribePlayerName(listener);

    setPlayerName("Aru");
    stop();
    setPlayerName("Mutsuki");

    expect(listener).toHaveBeenCalledTimes(1);
  });
});
