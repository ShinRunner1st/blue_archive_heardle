import { Student } from "../../types/student";
import { Portrait, usePortraits } from "../Portrait";

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

/** A card at the top of the page on a student's birthday, in every game. */
export function BirthdayNote({ students }: Props) {
  const portraits = usePortraits(students.map(({ id }) => id));
  if (students.length === 0) return null;

  return (
    <Styled.Note role="note">
      {portraits.size > 0 && (
        <Styled.Portraits aria-hidden="true">
          {students.map(({ id }) => {
            const url = portraits.get(id);
            return url ? <Portrait key={id} url={url} size={27} /> : null;
          })}
        </Styled.Portraits>
      )}
      <Styled.Text>
        Happy birthday, {names(students)}! <span aria-hidden="true">🎂</span>
      </Styled.Text>
    </Styled.Note>
  );
}
