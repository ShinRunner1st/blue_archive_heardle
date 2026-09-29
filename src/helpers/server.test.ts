import { describe, expect, it } from "vitest";

import { SERVER_KEY, STUDENT_STORAGE_KEYS } from "../constants/game";
import {
  getServer,
  resetServerState,
  serverSuffix,
  setServer,
  subscribeServer,
  withServerTag,
} from "./server";
import { loadStudentRounds, saveStudentRounds } from "./storage";

describe("server", () => {
  it("starts on Global and remembers a switch", () => {
    expect(getServer()).toBe("global");

    let heard = 0;
    const stop = subscribeServer(() => (heard += 1));
    setServer("jp");
    setServer("jp");
    stop();

    expect(heard).toBe(1);
    expect(localStorage.getItem(SERVER_KEY)).toBe("jp");
    resetServerState();
    expect(getServer()).toBe("jp");
  });

  it("keeps each server's rounds under its own key", () => {
    const round = { answer: 10005, guesses: [] };
    saveStudentRounds("lore-endless", [round], "jp");

    expect(localStorage.getItem(STUDENT_STORAGE_KEYS["lore-endless"])).toBe(
      null
    );
    expect(
      localStorage.getItem(`${STUDENT_STORAGE_KEYS["lore-endless"]}.jp`)
    ).not.toBe(null);
    expect(loadStudentRounds("lore-endless", "global")).toEqual([]);

    setServer("jp");
    expect(loadStudentRounds("lore-endless")).toEqual([round]);
  });

  it("marks share texts and pictures on JP only", () => {
    expect(serverSuffix()).toBe("");
    expect(withServerTag("VOICE · DAILY #3")).toBe("VOICE · DAILY #3");

    setServer("jp");
    expect(serverSuffix()).toBe(" (JP)");
    expect(withServerTag("VOICE · DAILY #3")).toBe("VOICE · DAILY #3 · JP");
  });
});
