import { Student } from "../../types/student";

import { StudentIcon } from "../StudentIcon";

import * as Styled from "./index.styled";

interface Props {
  students: Student[];
  /**
   * Shows their icons: in the student game, which has the icon sheet
   * already. The OST game shows the names alone, so a player who never opens
   * the student game never downloads the sheet.
   */
  withIcons: boolean;
}

/** "Hoshino", "Hoshino and Serika", "Aru, Hina and Iori". */
function names(students: Student[]): string {
  const list = students.map(({ name }) => name);
  if (list.length <= 1) return list.join("");
  return `${list.slice(0, -1).join(", ")} and ${list[list.length - 1]}`;
}

/** A line at the top of the page on a student's birthday. */
export function BirthdayNote({ students, withIcons }: Props) {
  if (students.length === 0) return null;

  return (
    <Styled.Note role="note">
      {withIcons ? (
        <Styled.Icons aria-hidden="true">
          {students.map(({ id }) => (
            <StudentIcon key={id} id={id} size={24} />
          ))}
        </Styled.Icons>
      ) : (
        <span aria-hidden="true">🎂</span>
      )}
      <span>Happy birthday, {names(students)}!</span>
      {withIcons && <span aria-hidden="true">🎂</span>}
    </Styled.Note>
  );
}
