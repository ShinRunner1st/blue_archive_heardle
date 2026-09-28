import { beforeEach, describe, expect, it, vi } from "vitest";

import { PLAYER_NAME_KEY } from "../constants/game";
import {
  getPlayerName,
  getSenseiTitle,
  MAX_PLAYER_NAME,
  resetPlayerNameState,
  setPlayerName,
  setSenseiTitle,
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

describe("the Sensei title", () => {
  beforeEach(() => {
    localStorage.clear();
    resetPlayerNameState();
  });

  it("is on until turned off, and remembered", () => {
    expect(getSenseiTitle()).toBe(true);
    setSenseiTitle(false);
    resetPlayerNameState();
    expect(getSenseiTitle()).toBe(false);
  });

  it("tells the listeners", () => {
    const heard = vi.fn();
    const stop = subscribePlayerName(heard);
    setSenseiTitle(false);
    stop();
    expect(heard).toHaveBeenCalledTimes(1);
  });
});
