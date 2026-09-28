import React from "react";
import { IoCloseCircleOutline, IoSearch } from "react-icons/io5";

import { isBirthday } from "../../helpers/birthdays";
import { searchStudents } from "../../helpers/searchStudent";
import { Student } from "../../types/student";

import { isTextField } from "../Search";
import { StudentIcon } from "../StudentIcon";

import * as Styled from "./index.styled";

interface Props {
  pool: Student[];
  /** Students already guessed this round, left out of the results. */
  guessed: ReadonlySet<number>;
  onGuess: (id: number) => void;
  /** False while a dialog is open, which gets the keys instead. */
  keyboardEnabled: boolean;
}

const LISTBOX_ID = "student-search-results";
const optionId = (index: number) => `${LISTBOX_ID}-option-${index}`;

/**
 * Finds a student by name and guesses them at once: picking from the list is
 * the guess, as there is nothing to listen to first. Typing anywhere on the
 * page types here, and Enter guesses the highlighted name, or the first.
 */
export function StudentSearch({
  pool,
  guessed,
  onGuess,
  keyboardEnabled,
}: Props) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [value, setValue] = React.useState("");
  const [focused, setFocused] = React.useState(-1);

  const results = React.useMemo(
    () => searchStudents(value, pool, guessed),
    [value, pool, guessed]
  );

  const clear = React.useCallback(() => {
    setValue("");
    setFocused(-1);
  }, []);

  const pick = React.useCallback(
    (student: Student) => {
      onGuess(student.id);
      clear();
      inputRef.current?.focus();
    },
    [onGuess, clear]
  );

  // Start typing anywhere on the page and it goes into the box, as in the
  // OST's search.
  React.useEffect(() => {
    if (!keyboardEnabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.length !== 1 || e.key === " ") return;
      if (e.ctrlKey || e.metaKey || e.altKey || e.isComposing) return;
      if (isTextField(e.target)) return;
      inputRef.current?.focus();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [keyboardEnabled]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      clear();
      return;
    }
    if (results.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocused((previous) => (previous + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocused((previous) =>
        previous <= 0 ? results.length - 1 : previous - 1
      );
    } else if (e.key === "Enter" && !e.repeat) {
      e.preventDefault();
      e.stopPropagation();
      pick(results[Math.max(focused, 0)]);
    }
  };

  const isOpen = results.length > 0;

  return (
    <Styled.SearchBox>
      <Styled.InputField>
        <IoSearch size={20} aria-hidden="true" />
        <Styled.Input
          ref={inputRef}
          value={value}
          onChange={(e) => {
            setValue(e.currentTarget.value);
            setFocused(-1);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Type a student's name"
          aria-label="Search for a student"
          role="combobox"
          aria-expanded={isOpen}
          aria-controls={LISTBOX_ID}
          aria-autocomplete="list"
          aria-activedescendant={focused >= 0 ? optionId(focused) : undefined}
          autoComplete="off"
          spellCheck={false}
        />
        {value && (
          <Styled.ClearButton
            type="button"
            onClick={() => {
              clear();
              inputRef.current?.focus();
            }}
            aria-label="Clear search"
          >
            <IoCloseCircleOutline size={20} aria-hidden="true" />
          </Styled.ClearButton>
        )}
      </Styled.InputField>
      <Styled.Results
        id={LISTBOX_ID}
        role="listbox"
        aria-label="Student search results"
      >
        {results.map((student, index) => (
          <Styled.Result
            key={student.id}
            id={optionId(index)}
            role="option"
            aria-selected={index === focused}
            $focused={index === focused}
            // Before the box loses focus, so the list is still there.
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => pick(student)}
          >
            <StudentIcon id={student.id} size={32} />
            <Styled.ResultName>
              <span>
                {student.name}
                {isBirthday(student) && " 🎂"}
              </span>
              <Styled.ResultFullName>{student.fullName}</Styled.ResultFullName>
            </Styled.ResultName>
          </Styled.Result>
        ))}
      </Styled.Results>
      <Styled.LiveRegion role="status" aria-live="polite">
        {isOpen
          ? `${results.length} ${results.length === 1 ? "match" : "matches"}`
          : ""}
      </Styled.LiveRegion>
    </Styled.SearchBox>
  );
}
