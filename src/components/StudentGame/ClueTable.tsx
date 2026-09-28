import React from "react";

import { isBirthday } from "../../helpers/birthdays";
import {
  CLUE_KEYS,
  CLUE_NAMES,
  compareStudents,
  describeClue,
  Verdict,
} from "../../helpers/studentClues";
import { studentById } from "../../helpers/studentRounds";
import { Student, StudentGame } from "../../types/student";

import { StudentIcon } from "../StudentIcon";

import * as Styled from "./index.styled";

interface Props {
  game: StudentGame;
  answer: Student;
  /** The ids guessed, oldest first; the table shows the newest on top. */
  guesses: number[];
  /** The guess just made on this screen, whose cells turn over in turn. */
  fresh?: number;
}

/** Between one cell turning over and the next. */
const STAGGER_MS = 110;

/** Past this, a gift's name is set smaller to fit its column. */
const LONG_TEXT = 16;

const LEGEND: Array<[Verdict, string]> = [
  ["right", "Right"],
  ["close", "Close"],
  ["wrong", "Wrong"],
];

/**
 * Every guess so far against the answer: a row each, a column for each
 * attribute, coloured by how it matches, with an arrow towards the answer
 * for numbers.
 */
export function ClueTable({ game, answer, guesses, fresh }: Props) {
  const keys = CLUE_KEYS[game];
  const rows = React.useMemo(
    () =>
      [...guesses].reverse().flatMap((id) => {
        const student = studentById.get(id);
        return student
          ? [{ student, clues: compareStudents(student, answer, game) }]
          : [];
      }),
    [guesses, answer, game]
  );

  if (rows.length === 0) return null;

  return (
    <>
      <Styled.TableScroll>
        <Styled.Table
          $columns={keys.length}
          role="table"
          aria-label="Your guesses"
        >
          <Styled.Row role="row">
            <Styled.HeadCell role="columnheader">Student</Styled.HeadCell>
            {keys.map((key) => (
              <Styled.HeadCell key={key} role="columnheader">
                {CLUE_NAMES[key]}
              </Styled.HeadCell>
            ))}
          </Styled.Row>
          {rows.map(({ student, clues }) => {
            const delay = (column: number) =>
              student.id === fresh ? column * STAGGER_MS : undefined;
            return (
              <Styled.Row key={student.id} role="row">
                <Styled.StudentCell role="rowheader" $delay={delay(0)}>
                  <StudentIcon id={student.id} size={36} />
                  {student.name}
                  {isBirthday(student) && (
                    <Styled.Cake role="img" aria-label="birthday today">
                      🎂
                    </Styled.Cake>
                  )}
                </Styled.StudentCell>
                {clues.map((clue, column) => (
                  <Styled.ClueCell
                    key={clue.key}
                    role="cell"
                    aria-label={describeClue(clue)}
                    $verdict={clue.verdict}
                    $delay={delay(column + 1)}
                  >
                    <span aria-hidden="true">
                      {clue.text.length > LONG_TEXT ? (
                        <Styled.LongText>{clue.text}</Styled.LongText>
                      ) : (
                        clue.text
                      )}
                    </span>
                    {clue.arrow && (
                      <Styled.Arrow aria-hidden="true">
                        {clue.arrow === "up" ? "▲" : "▼"}
                      </Styled.Arrow>
                    )}
                  </Styled.ClueCell>
                ))}
              </Styled.Row>
            );
          })}
        </Styled.Table>
      </Styled.TableScroll>
      <Styled.Legend aria-hidden="true">
        {LEGEND.map(([verdict, label]) => (
          <Styled.LegendItem key={verdict}>
            <Styled.Swatch $verdict={verdict} />
            {label}
          </Styled.LegendItem>
        ))}
        <Styled.LegendItem>▲▼ Higher or lower</Styled.LegendItem>
      </Styled.Legend>
    </>
  );
}
