import React from "react";

import { audioBaseUrl, backupUrlFor } from "../../helpers/audioUrl";
import { Student } from "../../types/student";

import * as Styled from "./index.styled";

interface Props {
  students: Student[];
}

/** "Hoshino", "Hoshino and Serika", "Aru, Hina and Iori". */
function names(students: Student[]): string {
  const list = students.map(({ name }) => name);
  if (list.length <= 1) return list.join("");
  return `${list.slice(0, -1).join(", ")} and ${list[list.length - 1]}`;
}

/**
 * The birthday students' portraits on the Worker, once their list has
 * loaded. The list (portraitFiles.ts, which the Sensei card uses too) is
 * loaded only on a birthday, and each portrait is about 7.5 KB, so every
 * game can show them: the icon sheet would be 450 KB for an OST player.
 */
function usePortraits(students: Student[]): Map<number, string> {
  const [urls, setUrls] = React.useState<Map<number, string>>(new Map());
  const ids = students.map(({ id }) => id).join(",");

  React.useEffect(() => {
    if (!ids) return;
    let live = true;
    import("../../constants/portraitFiles")
      .then(({ portraitFiles }) => {
        if (!live) return;
        const found = new Map<number, string>();
        for (const id of ids.split(",").map(Number)) {
          const file = portraitFiles[`portraits/${id}`];
          if (file) found.set(id, `${audioBaseUrl()}/${file}`);
        }
        setUrls(found);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [ids]);

  return urls;
}

/** A portrait, from its copy on R2 if the Worker fails; gone if both do. */
function Portrait({ url }: { url: string }) {
  const [src, setSrc] = React.useState(url);
  const [failed, setFailed] = React.useState(false);
  if (failed) return null;
  return (
    <Styled.Portrait
      src={src}
      alt=""
      width={40}
      height={40}
      onError={() => {
        const backup = backupUrlFor(url);
        if (backup && src !== backup) setSrc(backup);
        else setFailed(true);
      }}
    />
  );
}

/** A card at the top of the page on a student's birthday, in every game. */
export function BirthdayNote({ students }: Props) {
  const portraits = usePortraits(students);
  if (students.length === 0) return null;

  return (
    <Styled.Note role="note">
      {portraits.size > 0 && (
        <Styled.Portraits aria-hidden="true">
          {students.map(({ id }) => {
            const url = portraits.get(id);
            return url ? <Portrait key={id} url={url} /> : null;
          })}
        </Styled.Portraits>
      )}
      <span>
        Happy birthday, {names(students)}! <span aria-hidden="true">🎂</span>
      </span>
    </Styled.Note>
  );
}
