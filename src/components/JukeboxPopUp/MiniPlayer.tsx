import { IoClose, IoExpand } from "react-icons/io5";

import { Song } from "../../types/song";

import { AlbumArt, JukeboxAudio } from "./JukeboxPlayer";
import * as Styled from "./MiniPlayer.styled";

interface Props {
  song: Song;
  audio: JukeboxAudio;
  onNext?: () => void;
  /** Opens the Jukebox again. */
  onOpen: () => void;
  /** Stops the music and puts the player away. */
  onStop: () => void;
}

/**
 * The Jukebox, small, in the corner of the page: what plays on once the
 * Jukebox is closed, until a game's own audio plays. Play or pause, the next
 * song, the Jukebox again, or stop.
 */
export function MiniPlayer({ song, audio, onNext, onOpen, onStop }: Props) {
  const percent =
    audio.duration > 0
      ? `${Math.min(audio.time / audio.duration, 1) * 100}%`
      : "0%";

  return (
    <Styled.Mini aria-label="Jukebox">
      <Styled.Button
        type="button"
        onClick={audio.toggle}
        disabled={!audio.ready}
        aria-label={audio.playing ? "Pause" : "Play"}
      >
        {audio.playing ? (
          <Styled.PauseIcon aria-hidden="true" />
        ) : (
          <Styled.PlayIcon aria-hidden="true" />
        )}
      </Styled.Button>
      <Styled.Art aria-hidden="true">
        <AlbumArt song={song} />
      </Styled.Art>
      <Styled.Meta>
        <Styled.Name title={song.name}>{song.name}</Styled.Name>
        <Styled.Artist>
          {audio.failed
            ? "This track won’t play here."
            : `${song.artist} · Theme ${song.themeNo}`}
        </Styled.Artist>
      </Styled.Meta>
      <Styled.Small
        type="button"
        onClick={onNext}
        disabled={!onNext}
        aria-label="Next song"
      >
        <Styled.NextIcon aria-hidden="true" />
      </Styled.Small>
      <Styled.Small
        type="button"
        onClick={onOpen}
        aria-label="Open the Jukebox"
      >
        <IoExpand aria-hidden="true" />
      </Styled.Small>
      <Styled.Small type="button" onClick={onStop} aria-label="Stop the music">
        <IoClose aria-hidden="true" />
      </Styled.Small>
      <Styled.Progress aria-hidden="true">
        <Styled.Fill style={{ width: percent }} />
      </Styled.Progress>
    </Styled.Mini>
  );
}
