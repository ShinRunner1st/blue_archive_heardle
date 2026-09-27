import React from "react";
import { IoCheckmarkCircle, IoVolumeHigh } from "react-icons/io5";

import { Song } from "../../types/song";

import * as Styled from "./index.styled";

interface Props {
  songs: Song[];
  /** The theme number of the song picked, if any. */
  selected?: string;
  onPick: (song: Song) => void;
  /**
   * How the picked song is marked: a tick for a guess in All OST, a speaker
   * for the song playing in the Jukebox.
   */
  selectedMark: "check" | "playing";
  /** All OST: songs guessed wrong this round, dimmed and tagged. */
  guessed?: Set<string>;
  /** Jukebox: songs guessed right ever, bold; the rest are dimmed. */
  bright?: Set<string>;
}

interface RowProps {
  song: Song;
  selected: boolean;
  dim: boolean;
  strong: boolean;
  tag: string | null;
  mark: "check" | "playing";
  onPick: (song: Song) => void;
}

/**
 * One song. Memoised, so a click that changes one row - the song picked, the
 * song playing - only draws that row again, not the whole list.
 */
const Row = React.memo(function Row({
  song,
  selected,
  dim,
  strong,
  tag,
  mark,
  onPick,
}: RowProps) {
  const Mark = mark === "check" ? IoCheckmarkCircle : IoVolumeHigh;

  return (
    <li>
      <button
        type="button"
        className="row"
        onClick={() => onPick(song)}
        aria-pressed={selected}
        data-dim={dim && !selected}
        data-strong={strong}
      >
        <span className="name-cell">
          <span className="name">{song.name}</span>
          {tag && <span className="tag">{tag}</span>}
          {selected && <Mark className="mark" aria-hidden="true" />}
        </span>
        <span className="theme-no">
          {song.name !== `Theme ${song.themeNo}` && song.themeNo}
        </span>
        <span className="artist" title={song.artist}>
          {song.artist}
        </span>
      </button>
    </li>
  );
});

/** The rows of All OST and the Jukebox. */
export function SongRows({
  songs,
  selected,
  onPick,
  selectedMark,
  guessed,
  bright,
}: Props) {
  // Rows keep one handler for good, so they don't all draw again whenever
  // the parent makes a new one.
  const pickRef = React.useRef(onPick);
  pickRef.current = onPick;
  const pick = React.useCallback((song: Song) => pickRef.current(song), []);

  return (
    <Styled.Rows>
      {songs.map((song) => {
        const isGuessed = guessed?.has(song.themeNo) ?? false;
        const isBright = bright?.has(song.themeNo) ?? false;

        return (
          <Row
            key={song.themeNo}
            song={song}
            selected={song.themeNo === selected}
            dim={isGuessed || (bright !== undefined && !isBright)}
            strong={isBright}
            tag={isGuessed ? "Guessed" : null}
            mark={selectedMark}
            onPick={pick}
          />
        );
      })}
    </Styled.Rows>
  );
}
