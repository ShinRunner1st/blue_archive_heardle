import React from "react";
import { IoSearch, IoCloseCircleOutline, IoList } from "react-icons/io5";

import { searchSong } from "../../helpers";
import { Song } from "../../types/song";

import { ThemeTag } from "../ThemeTag";

import * as Styled from "./index.styled";

interface Props {
  currentTry: number;
  setSelectedSong: React.Dispatch<React.SetStateAction<Song | undefined>>;
  selectedSong: Song | undefined;
  inputRef: React.RefObject<HTMLInputElement | null>;
  /** Opens the full song list, for browsing instead of typing. */
  onBrowseSongs?: () => void;
  /** False while a dialog is open, which gets the keys instead. */
  keyboardEnabled: boolean;
}

const LISTBOX_ID = "song-search-results";
const optionId = (index: number) => `${LISTBOX_ID}-option-${index}`;

function label(song: Song): string {
  return `${song.artist} - ${song.name}`;
}

/** Somewhere typing already goes, so a key there is left alone. */
function isTextField(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable ||
      target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.tagName === "SELECT")
  );
}

export function Search({
  currentTry,
  setSelectedSong,
  selectedSong,
  inputRef,
  onBrowseSongs,
  keyboardEnabled,
}: Props) {
  const [value, setValue] = React.useState<string>("");
  const [results, setResults] = React.useState<Song[]>([]);
  const [focusedIndex, setFocusedIndex] = React.useState<number>(-1);

  // Clear the box when the round moves on to the next try.
  React.useEffect(() => {
    setValue("");
    setResults([]);
    setFocusedIndex(-1);
    setSelectedSong(undefined);
  }, [currentTry, setSelectedSong]);

  // A song picked from the full list arrives from outside; show it in the box
  // just as if it had been chosen from the search results.
  React.useEffect(() => {
    if (!selectedSong) return;

    setValue(label(selectedSong));
    setResults([]);
    setFocusedIndex(-1);
  }, [selectedSong]);

  const selectSong = React.useCallback(
    (song: Song) => {
      setSelectedSong(song);
      setValue(label(song));
      setResults([]);
      setFocusedIndex(-1);
      inputRef.current?.focus();
    },
    [setSelectedSong, inputRef]
  );

  const clear = React.useCallback(() => {
    setValue("");
    setResults([]);
    setFocusedIndex(-1);
    setSelectedSong(undefined);
    inputRef.current?.focus();
  }, [setSelectedSong, inputRef]);

  // Start typing anywhere on the page and it goes into the search box - no
  // need to click it first. Focusing the box while the key is still going
  // down lets the browser type the character there itself, which also keeps
  // input methods for other scripts working. Space is left out: it plays the
  // clip.
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
  }, [keyboardEnabled, inputRef]);

  // Typing anything invalidates a previous selection, so search and selection
  // are driven from one place rather than from an effect watching both.
  const handleChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const nextValue = e.currentTarget.value;

      setValue(nextValue);
      setFocusedIndex(-1);
      if (selectedSong) setSelectedSong(undefined);

      const matches = searchSong(nextValue);
      // Hide the list when the only match is exactly what is typed.
      setResults(
        matches.length === 1 && label(matches[0]) === nextValue ? [] : matches
      );
    },
    [selectedSong, setSelectedSong]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      clear();
      return;
    }

    if (results.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusedIndex((previous) => (previous + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusedIndex((previous) =>
        previous <= 0 ? results.length - 1 : previous - 1
      );
    } else if (e.key === "Home") {
      e.preventDefault();
      setFocusedIndex(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setFocusedIndex(results.length - 1);
    } else if (e.key === "Enter" && !e.shiftKey && focusedIndex !== -1) {
      // Stop the page-level Enter handler from also submitting this guess.
      e.preventDefault();
      e.stopPropagation();
      selectSong(results[focusedIndex]);
    }
  };

  const isOpen = results.length > 0;

  return (
    <Styled.Container>
      {/*
        WAI-ARIA 1.2 combobox: the input owns a separate listbox and points at
        the highlighted option with aria-activedescendant, so focus never
        leaves the text field while arrowing through results.
      */}
      <Styled.ResultsContainer
        id={LISTBOX_ID}
        role="listbox"
        aria-label="Song search results"
      >
        {results.map((song, index) => (
          <Styled.Result
            key={song.themeNo}
            id={optionId(index)}
            role="option"
            aria-selected={index === focusedIndex}
            $isFocused={index === focusedIndex}
            onClick={() => selectSong(song)}
          >
            <Styled.ResultText>{label(song)}</Styled.ResultText>
            {song.name !== `Theme ${song.themeNo}` && (
              <ThemeTag themeNo={song.themeNo} />
            )}
          </Styled.Result>
        ))}
      </Styled.ResultsContainer>
      <Styled.Row>
        <Styled.SearchContainer>
          <Styled.SearchPadding>
            <IoSearch size={20} aria-hidden="true" />
            <Styled.Input
              ref={inputRef}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              placeholder="Search"
              value={value}
              aria-label="Search for a song"
              role="combobox"
              aria-expanded={isOpen}
              aria-controls={LISTBOX_ID}
              aria-autocomplete="list"
              aria-activedescendant={
                focusedIndex >= 0 ? optionId(focusedIndex) : undefined
              }
              autoComplete="off"
              // Read by the player: Space types a space only while a name is
              // being typed, and plays the clip otherwise.
              data-typing={value !== "" && !selectedSong ? "true" : undefined}
            />
            {value && (
              <Styled.ClearButton
                type="button"
                onClick={clear}
                aria-label="Clear search"
              >
                <IoCloseCircleOutline size={20} aria-hidden="true" />
              </Styled.ClearButton>
            )}
          </Styled.SearchPadding>
          {/* Announces the result count to screen readers as the player types. */}
          <Styled.LiveRegion role="status" aria-live="polite">
            {isOpen
              ? `${results.length} ${
                  results.length === 1 ? "result" : "results"
                } available`
              : ""}
          </Styled.LiveRegion>
        </Styled.SearchContainer>
        {onBrowseSongs && (
          <Styled.BrowseButton
            type="button"
            onClick={onBrowseSongs}
            aria-label="Browse all OST"
            title="All OST"
          >
            <IoList size={22} aria-hidden="true" />
          </Styled.BrowseButton>
        )}
      </Styled.Row>
    </Styled.Container>
  );
}
