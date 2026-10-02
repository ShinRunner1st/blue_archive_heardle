import { beforeEach, describe, expect, it } from "vitest";

import { songs } from "../constants";
import { currentSave, saveData } from "../helpers/saveFile";
import { emptyGuesses, saveRounds } from "../helpers/storage";
import { saveFromAccountData } from "./accountSave";

beforeEach(() => localStorage.clear());

/** A Download my data file, as accountData.ts makes it. */
const download = (progress: unknown) =>
  JSON.stringify({
    about: "Everything Blue Archive Heardle keeps for your account",
    account: { publicId: "x" },
    progress,
    progressBackup: null,
  });

describe("a player's progress from Download my data", () => {
  it("reads the save in the file's progress", () => {
    saveRounds(
      [
        {
          solution: songs[0],
          currentTry: 1,
          didGuess: true,
          guesses: emptyGuesses(),
          startTime: 0,
        },
      ],
      "endless"
    );
    const save = saveData(currentSave());
    const result = saveFromAccountData(
      download({ format: 2, revision: 3, at: 1, save })
    );
    expect(result.ok && result.save.rounds.endless).toHaveLength(1);
  });

  it("says what's wrong with any other file", () => {
    expect(saveFromAccountData("not json")).toMatchObject({ ok: false });
    expect(saveFromAccountData(JSON.stringify({ app: "x" }))).toMatchObject({
      ok: false,
      error: expect.stringContaining("Download my data"),
    });
    expect(saveFromAccountData(download(null))).toEqual({
      ok: false,
      error: "That account has no progress yet.",
    });
  });
});
