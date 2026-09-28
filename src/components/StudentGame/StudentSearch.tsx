import React from "react";
import { IoCheckmark, IoCloseCircleOutline, IoSearch } from "react-icons/io5";

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
  /** Guesses a student: at once, or once a picked one is confirmed. */
  onGuess: (id: number) => void;
  /**
   * The student picked and waiting to be guessed, held by the game so its
   * grid, random pick and Guess button share it. With it, picking only fills
   * the box, as in the OST, and Enter or Guess confirms; without it (the
   * Sensei card's picker), picking is the choice.
   */
  selected?: Student;
  onSelect?: (student: Student | undefined) => void;
  /** A Guess button inside the box, for a game with no room under it. */
  guessButton?: boolean;
  /**
   * Which way the results open: down over what follows, or up, as the OST's
   * do, for a box low on the page, whose list would stretch it.
   */
  direction?: "down" | "up";
  /** False while a dialog is open, which gets the keys instead. */
  keyboardEnabled: boolean;
}

const LISTBOX_ID = "student-search-results";
const optionId = (index: number) => `${LISTBOX_ID}-option-${index}`;

/**
 * Finds a student by name. Typing anywhere on the page types here; Enter
 * picks the highlighted name, or the first, and Enter again guesses it.
 */
export function StudentSearch({
  pool,
  guessed,
  onGuess,
  selected,
  onSelect,
  guessButton = false,
  direction = "down",
  keyboardEnabled,
}: Props) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [value, setValue] = React.useState("");
  const [focused, setFocused] = React.useState(-1);
  const confirms = onSelect !== undefined;

  // A student picked from the grid, or at random, shows in the box as if
  // picked from the list.
  React.useEffect(() => {
    if (!selected) return;
    setValue(selected.name);
    setFocused(-1);
  }, [selected]);

  const results = React.useMemo(
    () => (selected ? [] : searchStudents(value, pool, guessed)),
    [selected, value, pool, guessed]
  );

  const clear = React.useCallback(() => {
    setValue("");
    setFocused(-1);
    onSelect?.(undefined);
  }, [onSelect]);

  const guess = React.useCallback(
    (student: Student) => {
      onGuess(student.id);
      clear();
      inputRef.current?.focus();
    },
    [onGuess, clear]
  );

  const pick = React.useCallback(
    (student: Student) => {
      if (!onSelect) {
        guess(student);
        return;
      }
      onSelect(student);
      inputRef.current?.focus();
    },
    [onSelect, guess]
  );

  // Start typing anywhere on the page and it goes into the box, as in the
  // OST's search. Enter guesses the student picked from wherever the focus
  // is, as the grid leaves it on the page.
  React.useEffect(() => {
    if (!keyboardEnabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        if (!selected || e.shiftKey || e.repeat) return;
        if (e.target === inputRef.current) return;
        if (e.target instanceof HTMLButtonElement) return;
        e.preventDefault();
        guess(selected);
        return;
      }
      if (e.key.length !== 1 || e.key === " ") return;
      if (e.ctrlKey || e.metaKey || e.altKey || e.isComposing) return;
      if (isTextField(e.target)) return;
      inputRef.current?.focus();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [keyboardEnabled, selected, guess]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      clear();
      return;
    }
    // Shift+Enter is Voice mode's skip, left for the page to handle.
    if (e.key === "Enter" && !e.repeat && !e.shiftKey && selected) {
      e.preventDefault();
      e.stopPropagation();
      guess(selected);
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
    } else if (e.key === "Enter" && !e.repeat && !e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      pick(results[Math.max(focused, 0)]);
    }
  };

  const isOpen = results.length > 0;

  return (
    <Styled.SearchBox>
      <Styled.InputField>
        {selected ? (
          <StudentIcon id={selected.id} size={24} />
        ) : (
          <IoSearch size={20} aria-hidden="true" />
        )}
        <Styled.Input
          ref={inputRef}
          name="student-search"
          value={value}
          onChange={(e) => {
            setValue(e.currentTarget.value);
            setFocused(-1);
            if (selected) onSelect?.(undefined);
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
          // Read by the player: Space types a space only while a name is
          // being typed, and plays the line otherwise.
          data-typing={value !== "" && !selected ? "true" : undefined}
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
        {confirms && guessButton && (
          <Styled.InlineGuess
            type="button"
            onClick={() => selected && guess(selected)}
            disabled={!selected}
            aria-label="Guess"
          >
            <IoCheckmark aria-hidden="true" />
            <span>Guess</span>
          </Styled.InlineGuess>
        )}
      </Styled.InputField>
      <Styled.Results
        id={LISTBOX_ID}
        role="listbox"
        aria-label="Student search results"
        $up={direction === "up"}
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
          : selected
          ? `${selected.name} picked: Enter to guess`
          : ""}
      </Styled.LiveRegion>
    </Styled.SearchBox>
  );
}
