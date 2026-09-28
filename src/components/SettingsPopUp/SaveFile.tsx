import React from "react";
import { IoSave } from "react-icons/io5";

import { calStats } from "../../helpers";
import {
  buildSaveFile,
  downloadText,
  MAX_SAVE_FILE_BYTES,
  readSaveFile,
  reloadPage,
  saveFileName,
  SaveFile as SaveFileData,
} from "../../helpers/saveFile";
import { markFirstRunDone, replaceAllRounds } from "../../helpers/storage";
import {
  PopUpCard,
  PopUpCardBody,
  PopUpCardIcon,
  PopUpCardText,
  PopUpCardTitle,
} from "../PopUp";

import * as Styled from "./index.styled";

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

/** What's in a save, so the player can tell it's the one they meant. */
function describe(save: SaveFileData): string {
  const daily = calStats(save.rounds.daily)[7];
  const endless = calStats(save.rounds.endless)[7];
  const students = Object.values(save.students).reduce(
    (sum, rounds) => sum + rounds.length,
    0
  );
  const songs = `${plural(daily, "daily puzzle", "daily puzzles")} and ${plural(
    endless,
    "endless song",
    "endless songs"
  )}`;
  const counts =
    students > 0
      ? `${songs}, and ${plural(students, "student round", "student rounds")}`
      : songs;

  if (!save.exported) return `It has ${counts}.`;

  const date = new Date(save.exported).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return `Saved on ${date}, with ${counts}.`;
}

/**
 * Moves progress between browsers or devices, since it is otherwise kept only
 * in this one. The file is made and read on the device; nothing is uploaded.
 */
export function SaveFile() {
  const [pending, setPending] = React.useState<SaveFileData | null>(null);
  const [error, setError] = React.useState("");

  const exportSave = () => {
    setError("");
    downloadText(saveFileName(), buildSaveFile());
  };

  const pickFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    // Cleared so picking the same file again still counts as a change.
    input.value = "";
    if (!file) return;

    setPending(null);
    setError("");

    if (file.size > MAX_SAVE_FILE_BYTES) {
      setError("That file is too big to be a Blue Archive Heardle save.");
      return;
    }

    let text: string;
    try {
      text = await file.text();
    } catch {
      setError("That file couldn't be read. Try picking it again.");
      return;
    }

    const result = readSaveFile(text);
    if (result.ok) setPending(result.save);
    else setError(result.error);
  };

  const replace = () => {
    if (!pending) return;

    if (!replaceAllRounds(pending.rounds, pending.students)) {
      setPending(null);
      setError(
        "This browser wouldn't store the save. Check that site data is allowed."
      );
      return;
    }

    // A player bringing a save isn't new, so the welcome is skipped.
    markFirstRunDone();
    reloadPage();
  };

  return (
    <PopUpCard>
      <PopUpCardIcon>
        <IoSave aria-hidden="true" />
      </PopUpCardIcon>
      <Styled.Stack>
        <PopUpCardBody>
          <PopUpCardTitle>Save file</PopUpCardTitle>
          <PopUpCardText>
            Your progress is kept only in this browser. Export it to a file to
            keep a copy, or import it on another device to carry on there.
          </PopUpCardText>
        </PopUpCardBody>

        {pending ? (
          <>
            <Styled.Notice role="status">
              {describe(pending)} Importing replaces the progress on this device
              in every mode.
            </Styled.Notice>
            <Styled.Actions>
              <Styled.Action type="button" $tone="red" onClick={replace}>
                Replace
              </Styled.Action>
              <Styled.Action type="button" onClick={() => setPending(null)}>
                Cancel
              </Styled.Action>
            </Styled.Actions>
          </>
        ) : (
          <Styled.Actions>
            <Styled.Action type="button" onClick={exportSave}>
              Export
            </Styled.Action>
            <Styled.FileAction>
              Import
              <input type="file" accept=".txt,text/plain" onChange={pickFile} />
            </Styled.FileAction>
          </Styled.Actions>
        )}

        {error && <Styled.Notice role="alert">{error}</Styled.Notice>}
      </Styled.Stack>
    </PopUpCard>
  );
}
