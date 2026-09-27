import React from "react";

import { ALBUM_FILTERS, albumCount, jukeboxSongs } from "../../helpers/jukebox";
import {
  loadJukeboxAutoNext,
  saveJukeboxAutoNext,
} from "../../helpers/storage";
import { Song } from "../../types/song";

import { Button } from "../Button";
import { PopUp } from "../PopUp";

import { JukeboxPlayer } from "./JukeboxPlayer";
import * as Styled from "./index.styled";

interface Props {
  onClose: () => void;
  /** Theme numbers guessed right at least once, in any mode. */
  guessed: Set<string>;
}

const COUNTS = new Map(
  ALBUM_FILTERS.map((filter) => [filter.id, albumCount(filter)])
);

/**
 * Every song in the game to listen to in full, from the ☰ menu. The list is
 * the All OST list's: theme order, a search box, and album chips that can be
 * combined. Songs guessed right in any mode stand out; the rest are dimmed.
 *
 * A song is fetched when it is picked, from the audio Worker, which asks the
 * browser to keep it for a year: playing it again costs nothing.
 */
export function JukeboxPopUp({ onClose, guessed }: Props) {
  const [filter, setFilter] = React.useState("");
  const [albums, setAlbums] = React.useState<string[]>([]);
  const [playing, setPlaying] = React.useState<Song>();
  const [autoNext, setAutoNext] = React.useState(loadJukeboxAutoNext);

  const changeAutoNext = (on: boolean) => {
    setAutoNext(on);
    saveJukeboxAutoNext(on);
  };

  const matches = React.useMemo(
    () => jukeboxSongs(filter, albums),
    [filter, albums]
  );
  const found = jukeboxSongs("", []).filter((song) =>
    guessed.has(song.themeNo)
  ).length;

  const toggleAlbum = (id: string) =>
    setAlbums((current) =>
      current.includes(id)
        ? current.filter((picked) => picked !== id)
        : ALBUM_FILTERS.map((album) => album.id).filter(
            (album) => album === id || current.includes(album)
          )
    );

  // Previous and next follow the list as it is filtered now.
  const index = playing
    ? matches.findIndex((song) => song.themeNo === playing.themeNo)
    : -1;
  const previous = index > 0 ? matches[index - 1] : undefined;
  const next = index >= 0 ? matches[index + 1] : undefined;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // With the list narrowed to one song, Enter plays it.
    if (e.key === "Enter" && matches.length === 1) {
      e.preventDefault();
      setPlaying(matches[0]);
    }
  };

  return (
    <PopUp
      title="Jukebox 🎵"
      subtitle={`Play any song in full. The bright ones are the ${found} of ${
        jukeboxSongs("", []).length
      } you've guessed.`}
      onClose={onClose}
      actions={
        <Button variant="green" onClick={onClose}>
          Close
        </Button>
      }
    >
      <JukeboxPlayer
        song={playing}
        onPrevious={previous && (() => setPlaying(previous))}
        onNext={next && (() => setPlaying(next))}
        autoNext={autoNext}
        onAutoNextChange={changeAutoNext}
      />

      <Styled.Filter>
        <Styled.FilterIcon aria-hidden="true" />
        <Styled.FilterInput
          type="search"
          value={filter}
          onChange={(e) => setFilter(e.currentTarget.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search by name, artist or number"
          aria-label="Search songs"
          autoComplete="off"
        />
      </Styled.Filter>

      <Styled.Albums role="group" aria-label="Filter by album">
        <Styled.Chip
          type="button"
          aria-pressed={albums.length === 0}
          $active={albums.length === 0}
          onClick={() => setAlbums([])}
        >
          All
        </Styled.Chip>
        {ALBUM_FILTERS.map((album) => (
          <Styled.Chip
            key={album.id}
            type="button"
            aria-pressed={albums.includes(album.id)}
            $active={albums.includes(album.id)}
            onClick={() => toggleAlbum(album.id)}
          >
            {album.label}
            <Styled.ChipCount>{COUNTS.get(album.id)}</Styled.ChipCount>
          </Styled.Chip>
        ))}
      </Styled.Albums>

      <Styled.Count role="status" aria-live="polite">
        {matches.length} {matches.length === 1 ? "song" : "songs"}
      </Styled.Count>

      <Styled.List>
        {matches.length === 0 && (
          <Styled.Empty>No songs match “{filter.trim()}”.</Styled.Empty>
        )}
        <Styled.Songs>
          {matches.map((song) => {
            const isPlaying = playing?.themeNo === song.themeNo;

            return (
              <li key={song.themeNo}>
                <Styled.SongButton
                  type="button"
                  onClick={() => setPlaying(song)}
                  aria-pressed={isPlaying}
                  $bright={guessed.has(song.themeNo)}
                  $selected={isPlaying}
                >
                  <Styled.NameCell>
                    <Styled.SongName>{song.name}</Styled.SongName>
                    {isPlaying && <Styled.NowIcon aria-hidden="true" />}
                  </Styled.NameCell>
                  <Styled.ThemeNo>
                    {song.name !== `Theme ${song.themeNo}` && song.themeNo}
                  </Styled.ThemeNo>
                  <Styled.ArtistTag title={song.artist}>
                    {song.artist}
                  </Styled.ArtistTag>
                </Styled.SongButton>
              </li>
            );
          })}
        </Styled.Songs>
      </Styled.List>
    </PopUp>
  );
}
