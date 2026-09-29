import React from "react";
import { IoCloseCircleOutline } from "react-icons/io5";

import { ALBUM_FILTERS, albumCount, jukeboxSongs } from "../../helpers/jukebox";
import {
  JukeboxRepeat,
  loadJukeboxRepeat,
  saveJukeboxRepeat,
} from "../../helpers/storage";
import { Song } from "../../types/song";

import { Button } from "../Button";
import { FoldingChips } from "../FoldingChips";
import { PopUp } from "../PopUp";
import { SongRows } from "../SongRows";

import { JukeboxPlayer, useJukeboxAudio } from "./JukeboxPlayer";
import { MiniPlayer } from "./MiniPlayer";
import * as Styled from "./index.styled";

interface Props {
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  /** Theme numbers guessed right at least once, in any mode. */
  guessed: Set<string>;
}

const COUNTS = new Map(
  ALBUM_FILTERS.map((filter) => [filter.id, albumCount(filter)])
);

/**
 * Every song in the game to listen to in full, from the ☰ menu. It stays
 * mounted, holding the song and its audio, so the music can outlive the
 * pop-up (see keepPlaying). The list is
 * the All OST list's: theme order, a search box, and album chips that can be
 * combined. Songs guessed right in any mode stand out; the rest are dimmed.
 *
 * A song is fetched when it is picked, from the audio Worker, which asks the
 * browser to keep it for a year: playing it again costs nothing.
 */
export function Jukebox({ open, onOpen, onClose, guessed }: Props) {
  const [filter, setFilter] = React.useState("");
  const filterRef = React.useRef<HTMLInputElement>(null);
  const [albums, setAlbums] = React.useState<string[]>([]);
  const [playing, setPlaying] = React.useState<Song>();
  const [repeat, setRepeat] = React.useState(loadJukeboxRepeat);

  const changeRepeat = (next: JukeboxRepeat) => {
    setRepeat(next);
    saveJukeboxRepeat(next);
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
  const playNext = next && (() => setPlaying(next));

  const audio = useJukeboxAudio(playing, repeat, playNext);

  // Closed, the music plays on in the corner, in every game, until something
  // else plays: an OST clip, a voice line, a result's song. Then it stops,
  // rather than wait in the corner, paused by playOneAtATime.
  React.useEffect(() => {
    if (open || !playing) return;
    const stopForOther = (event: Event) => {
      const media = event.target;
      if (media instanceof HTMLMediaElement && !("jukebox" in media.dataset)) {
        setPlaying(undefined);
      }
    };
    document.addEventListener("play", stopForOther, true);
    return () => document.removeEventListener("play", stopForOther, true);
  }, [open, playing]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // With the list narrowed to one song, Enter plays it.
    if (e.key === "Enter" && matches.length === 1) {
      e.preventDefault();
      setPlaying(matches[0]);
    }
  };

  // The audio element comes first either way, so opening and closing the
  // pop-up never makes a new one, which would cut the music.
  return (
    <>
      {audio.element}
      {!open ? (
        playing && (
          <MiniPlayer
            song={playing}
            audio={audio}
            onNext={playNext}
            onOpen={onOpen}
            onStop={() => setPlaying(undefined)}
          />
        )
      ) : (
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
            audio={audio}
            onPrevious={previous && (() => setPlaying(previous))}
            onNext={playNext}
            repeat={repeat}
            onRepeatChange={changeRepeat}
          />

          <Styled.Filter>
            <Styled.FilterIcon aria-hidden="true" />
            <Styled.FilterInput
              ref={filterRef}
              name="jukebox-search"
              type="text"
              enterKeyHint="search"
              value={filter}
              onChange={(e) => setFilter(e.currentTarget.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search by name, artist or number"
              aria-label="Search songs"
              autoComplete="off"
            />
            {filter && (
              <Styled.FilterClear
                type="button"
                onClick={() => {
                  setFilter("");
                  filterRef.current?.focus();
                }}
                aria-label="Clear search"
              >
                <IoCloseCircleOutline size={20} aria-hidden="true" />
              </Styled.FilterClear>
            )}
          </Styled.Filter>

          <FoldingChips
            id="jukebox-albums"
            label="Filter by album"
            more="All albums"
            fewer="Fewer albums"
            summary={
              <Styled.Count role="status" aria-live="polite">
                {matches.length} {matches.length === 1 ? "song" : "songs"}
              </Styled.Count>
            }
          >
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
          </FoldingChips>

          <Styled.List>
            {matches.length === 0 && (
              <Styled.Empty>No songs match “{filter.trim()}”.</Styled.Empty>
            )}
            <SongRows
              songs={matches}
              selected={playing?.themeNo}
              onPick={setPlaying}
              selectedMark="playing"
              bright={guessed}
            />
          </Styled.List>
        </PopUp>
      )}
    </>
  );
}

/** The Jukebox as a pop-up on its own, stopping when it closes. */
export function JukeboxPopUp({
  onClose,
  guessed,
}: {
  onClose: () => void;
  guessed: Set<string>;
}) {
  return <Jukebox open onOpen={onClose} onClose={onClose} guessed={guessed} />;
}
