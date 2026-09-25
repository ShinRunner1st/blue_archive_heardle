import React from "react";

import { filterSongs, groupByArtist } from "../../helpers/searchSong";
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
 * Every song, grouped by artist, for players who would rather browse than
 * type. Picking one selects it as the guess, exactly like choosing a search
 * result.
 */
export function SongListPopUp({
  onClose,
  onSelect,
  selectedSong,
  guessed,
}: Props) {
  const [filter, setFilter] = React.useState("");

  const matches = React.useMemo(() => filterSongs(filter), [filter]);
  const groups = React.useMemo(() => groupByArtist(matches), [matches]);
  const guessedSet = React.useMemo(() => new Set(guessed), [guessed]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // With the list narrowed to one song, Enter picks it.
    if (e.key === "Enter" && matches.length === 1) {
      e.preventDefault();
      onSelect(matches[0]);
    }
  };

  return (
    <PopUp
      title="All songs"
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
          placeholder="Filter by name, artist or number"
          aria-label="Filter songs"
          autoComplete="off"
        />
      </Styled.Filter>

      <Styled.Count role="status" aria-live="polite">
        {matches.length} {matches.length === 1 ? "song" : "songs"}
      </Styled.Count>

      <Styled.List>
        {groups.length === 0 && (
          <Styled.Empty>No songs match “{filter.trim()}”.</Styled.Empty>
        )}

        {groups.map((group) => (
          <Styled.Group key={group.artist}>
            <Styled.Artist>
              {group.artist}
              <Styled.ArtistCount>{group.songs.length}</Styled.ArtistCount>
            </Styled.Artist>
            <Styled.Songs>
              {group.songs.map((song) => {
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
                    </Styled.SongButton>
                  </li>
                );
              })}
            </Styled.Songs>
          </Styled.Group>
        ))}
      </Styled.List>
    </PopUp>
  );
}
