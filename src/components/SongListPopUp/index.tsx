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

const orList = new Intl.ListFormat("en", { type: "disjunction" });

/**
 * Every song in theme order, for players who would rather browse than type,
 * narrowed by any number of artists and by a text filter. Picking one selects
 * it as the guess, exactly like choosing a search result.
 */
export function SongListPopUp({
  onClose,
  onSelect,
  selectedSong,
  guessed,
}: Props) {
  const [filter, setFilter] = React.useState("");
  /** The artists picked, in chip order. Empty means every artist. */
  const [picked, setPicked] = React.useState<string[]>([]);

  const matches = React.useMemo(
    () => filterSongs(filter, picked),
    [filter, picked]
  );
  const guessedSet = React.useMemo(() => new Set(guessed), [guessed]);

  const toggleArtist = (artist: string) =>
    setPicked((current) =>
      current.includes(artist)
        ? current.filter((name) => name !== artist)
        : artists
            .map((entry) => entry.artist)
            .filter((name) => name === artist || current.includes(name))
    );

  // The chips fold to two rows, and only offer to unfold when they need to -
  // so the list can take any number of artists without a layout change.
  const chipsRef = React.useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = React.useState(false);
  const [overflows, setOverflows] = React.useState(false);

  React.useLayoutEffect(() => {
    const chips = chipsRef.current;
    if (!chips || expanded) return;

    const measure = () =>
      setOverflows(chips.scrollHeight > chips.clientHeight + 1);
    measure();

    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(chips);
    return () => observer.disconnect();
  }, [expanded]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // With the list narrowed to one song, Enter picks it.
    if (e.key === "Enter" && matches.length === 1) {
      e.preventDefault();
      onSelect(matches[0]);
    }
  };

  const term = filter.trim();
  const byArtists = picked.length > 0 ? ` by ${orList.format(picked)}` : "";

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

      <Styled.Artists
        ref={chipsRef}
        id="song-list-artists"
        role="group"
        aria-label="Filter by artist"
        $expanded={expanded}
      >
        <Styled.Chip
          type="button"
          aria-pressed={picked.length === 0}
          $active={picked.length === 0}
          onClick={() => setPicked([])}
        >
          All
        </Styled.Chip>
        {artists.map((entry) => {
          const isPicked = picked.includes(entry.artist);

          return (
            <Styled.Chip
              key={entry.artist}
              type="button"
              aria-pressed={isPicked}
              $active={isPicked}
              onClick={() => toggleArtist(entry.artist)}
            >
              {entry.artist}
              <Styled.ChipCount>{entry.count}</Styled.ChipCount>
            </Styled.Chip>
          );
        })}
      </Styled.Artists>

      <Styled.Summary>
        <Styled.Count role="status" aria-live="polite">
          {matches.length} {matches.length === 1 ? "song" : "songs"}
          {picked.length > 0 && (
            <>
              {" · "}
              {picked.length === 1 ? picked[0] : `${picked.length} artists`}
            </>
          )}
        </Styled.Count>
        {(overflows || expanded) && (
          <Styled.MoreButton
            type="button"
            onClick={() => setExpanded((was) => !was)}
            aria-expanded={expanded}
            aria-controls="song-list-artists"
          >
            {expanded ? "Fewer artists" : `All ${artists.length} artists`}
            <Styled.MoreIcon $expanded={expanded} aria-hidden="true" />
          </Styled.MoreButton>
        )}
      </Styled.Summary>

      <Styled.List>
        {matches.length === 0 && (
          <Styled.Empty>
            No songs match
            {term && ` “${term}”`}
            {byArtists}.
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
                  <Styled.NameCell>
                    <Styled.SongName>{song.name}</Styled.SongName>
                    {isGuessed && <Styled.Tag>Guessed</Styled.Tag>}
                    {isSelected && <Styled.Check aria-hidden="true" />}
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
