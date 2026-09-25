import React from "react";

import { artists, filterSongs } from "../../helpers/searchSong";
import { Song } from "../../types/song";

import { PopUp } from "../PopUp";

import * as Styled from "./index.styled";

interface Props {
  onClose: () => void;
  /** Picks the song as the guess; the caller closes the list. */
  onSelect: (song: Song) => void;
  selectedSong?: Song;
  /** Theme numbers already guessed wrong this round. */
  guessed: string[];
}

/**
 * Every song in theme order, for players who would rather browse than type,
 * narrowed by artist and by a text filter. Picking one selects it as the
 * guess, exactly like choosing a search result.
 */
export function SongListPopUp({
  onClose,
  onSelect,
  selectedSong,
  guessed,
}: Props) {
  const [filter, setFilter] = React.useState("");
  /** Undefined means every artist. */
  const [artist, setArtist] = React.useState<string>();

  const matches = React.useMemo(
    () => filterSongs(filter, artist),
    [filter, artist]
  );
  const guessedSet = React.useMemo(() => new Set(guessed), [guessed]);

  // Tapping the artist already picked goes back to everyone.
  const pickArtist = (next?: string) =>
    setArtist((current) => (current === next ? undefined : next));

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // With the list narrowed to one song, Enter picks it.
    if (e.key === "Enter" && matches.length === 1) {
      e.preventDefault();
      onSelect(matches[0]);
    }
  };

  const term = filter.trim();

  return (
    <PopUp
      title="All OST"
      subtitle="Tap a song to pick it as your guess."
      onClose={onClose}
    >
      <Styled.Filter>
        <Styled.FilterIcon aria-hidden="true" />
        <Styled.FilterInput
          type="search"
          value={filter}
          onChange={(e) => setFilter(e.currentTarget.value)}
          onKeyDown={handleKeyDown}
          placeholder="Filter by name or number"
          aria-label="Filter songs"
          autoComplete="off"
        />
      </Styled.Filter>

      <Styled.Artists role="group" aria-label="Filter by artist">
        <Styled.Chip
          type="button"
          aria-pressed={artist === undefined}
          $active={artist === undefined}
          onClick={() => setArtist(undefined)}
        >
          All
        </Styled.Chip>
        {artists.map((entry) => (
          <Styled.Chip
            key={entry.artist}
            type="button"
            aria-pressed={artist === entry.artist}
            $active={artist === entry.artist}
            onClick={() => pickArtist(entry.artist)}
          >
            {entry.artist}
            <Styled.ChipCount>{entry.count}</Styled.ChipCount>
          </Styled.Chip>
        ))}
      </Styled.Artists>

      <Styled.Count role="status" aria-live="polite">
        {matches.length} {matches.length === 1 ? "song" : "songs"}
      </Styled.Count>

      <Styled.List>
        {matches.length === 0 && (
          <Styled.Empty>
            No songs match
            {term && ` “${term}”`}
            {artist && ` by ${artist}`}.
          </Styled.Empty>
        )}

        <Styled.Songs>
          {matches.map((song) => {
            const isSelected = selectedSong?.themeNo === song.themeNo;
            const isGuessed = guessedSet.has(song.themeNo);

            return (
              <li key={song.themeNo}>
                <Styled.SongButton
                  type="button"
                  onClick={() => onSelect(song)}
                  aria-pressed={isSelected}
                  $selected={isSelected}
                  $guessed={isGuessed}
                >
                  <Styled.SongName>{song.name}</Styled.SongName>
                  {isGuessed && <Styled.Tag>Guessed</Styled.Tag>}
                  {isSelected && <Styled.Check aria-hidden="true" />}
                  {song.name !== `Theme ${song.themeNo}` && (
                    <Styled.ThemeNo>{song.themeNo}</Styled.ThemeNo>
                  )}
                  <Styled.ArtistTag>{song.artist}</Styled.ArtistTag>
                </Styled.SongButton>
              </li>
            );
          })}
        </Styled.Songs>
      </Styled.List>
    </PopUp>
  );
}
