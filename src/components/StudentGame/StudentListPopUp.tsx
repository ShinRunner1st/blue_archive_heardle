import React from "react";

import { Student } from "../../types/student";

import { Button } from "../Button";
import { PopUp } from "../PopUp";
import { StudentIcon } from "../StudentIcon";

import * as Styled from "./StudentListPopUp.styled";

interface Props {
  pool: Student[];
  /** Students already guessed this round, which can't be picked again. */
  guessed: ReadonlySet<number>;
  onPick: (id: number) => void;
  onClose: () => void;
}

/**
 * Every student in the round's pool, as icons with their names, to guess
 * by sight instead of typing, like All OST for the songs. Sorted by name:
 * the table's order is the release order, which is one of the clues.
 */
export function StudentListPopUp({ pool, guessed, onPick, onClose }: Props) {
  const sorted = React.useMemo(
    () => [...pool].sort((a, b) => a.name.localeCompare(b.name)),
    [pool]
  );

  return (
    <PopUp
      title="All students"
      subtitle={`${pool.length} students, by name. Pick one to guess.`}
      onClose={onClose}
      actions={
        <Button variant="green" onClick={onClose}>
          Close
        </Button>
      }
    >
      <Styled.Grid>
        {sorted.map((student) => {
          const done = guessed.has(student.id);
          return (
            <Styled.Tile
              key={student.id}
              type="button"
              disabled={done}
              aria-label={done ? `${student.name}, guessed` : student.name}
              title={student.name}
              onClick={() => onPick(student.id)}
            >
              <StudentIcon id={student.id} size={56} />
              <Styled.Name aria-hidden="true">{student.name}</Styled.Name>
            </Styled.Tile>
          );
        })}
      </Styled.Grid>
    </PopUp>
  );
}
