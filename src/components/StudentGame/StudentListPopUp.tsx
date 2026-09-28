import React from "react";

import { Student } from "../../types/student";

import { Button } from "../Button";
import { PopUp } from "../PopUp";
import { studentIconStyle, useStudentIconSheet } from "../StudentIcon";

import * as Styled from "./StudentListPopUp.styled";

interface Props {
  pool: Student[];
  /** Students already guessed this round, which can't be picked again. */
  guessed: ReadonlySet<number>;
  onPick: (id: number) => void;
  onClose: () => void;
}

/** Each pool sorted once a visit: the pools never change. */
const sortedPools = new WeakMap<Student[], Student[]>();

function byName(pool: Student[]): Student[] {
  let sorted = sortedPools.get(pool);
  if (!sorted) {
    sorted = [...pool].sort((a, b) => a.name.localeCompare(b.name));
    sortedPools.set(pool, sorted);
  }
  return sorted;
}

/**
 * Tiles drawn with the pop-up's first frame, a few rows' worth; the rest
 * follow straight after, so the pop-up opens without waiting on all of them.
 */
const FIRST_TILES = 40;

const ICON_SIZE = 56;

/**
 * Every student in the round's pool, as icons with their names, to guess
 * by sight instead of typing, like All OST for the songs. Sorted by name:
 * the table's order is the release order, which is one of the clues.
 */
export function StudentListPopUp({ pool, guessed, onPick, onClose }: Props) {
  const sorted = byName(pool);
  const first = React.useMemo(() => sorted.slice(0, FIRST_TILES), [sorted]);
  const shown = React.useDeferredValue(sorted, first);
  const sheet = useStudentIconSheet();

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
        {shown.map((student) => {
          const done = guessed.has(student.id);
          return (
            <button
              key={student.id}
              type="button"
              className="tile"
              disabled={done}
              aria-label={done ? `${student.name}, guessed` : student.name}
              title={student.name}
              onClick={() => onPick(student.id)}
            >
              <span
                className="icon"
                aria-hidden="true"
                style={studentIconStyle(sheet, student.id, ICON_SIZE)}
              />
              <span className="name" aria-hidden="true">
                {student.name}
              </span>
            </button>
          );
        })}
      </Styled.Grid>
    </PopUp>
  );
}
