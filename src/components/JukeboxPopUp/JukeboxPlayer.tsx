import React from "react";

import { clipInfo, getSongUrl } from "../../helpers/audioUrl";
import { useAudioSource } from "../../hooks/useAudioSource";
import { useAudioVolume } from "../../hooks/useVolume";
import { JukeboxRepeat } from "../../helpers/storage";
import { Song } from "../../types/song";

import { VolumeControl } from "../VolumeControl";

import * as Styled from "./index.styled";

/** The Jukebox's audio, kept by the Jukebox so it can outlive its pop-up. */
export interface JukeboxAudio {
  /** The audio element itself, to render wherever the Jukebox is. */
  element: React.ReactElement;
  playing: boolean;
  ready: boolean;
  time: number;
  duration: number;
  failed: boolean;
  toggle: () => void;
  seek: (seconds: number) => void;
}

/**
 * Plays the song picked, whole, as soon as it loads. What happens when it
 * ends follows `repeat`: it stops, `onNext` plays the next, or it loops.
 */
export function useJukeboxAudio(
  song: Song | undefined,
  repeat: JukeboxRepeat,
  onNext?: () => void
): JukeboxAudio {
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = React.useState(false);
  const [ready, setReady] = React.useState(false);
  const [time, setTime] = React.useState(0);

  const themeNo = song?.themeNo;
  const duration = themeNo ? clipInfo(themeNo).duration : 0;
  const source = useAudioSource(themeNo ? getSongUrl(themeNo) : null);

  // A new song starts from nothing. Done while rendering, so no frame shows
  // the last song's time against the new one's name.
  const [shown, setShown] = React.useState(themeNo);
  if (shown !== themeNo) {
    setShown(themeNo);
    setReady(false);
    setPlaying(false);
    setTime(0);
  }

  useAudioVolume(audioRef);

  const handleReady = React.useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    setReady(true);
    // Picked a moment ago, so this plays; a browser that blocks it leaves the
    // play button to press.
    Promise.resolve(audio.play()).catch(() => undefined);
  }, []);

  const toggle = React.useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !ready) return;
    if (audio.paused) Promise.resolve(audio.play()).catch(() => undefined);
    else audio.pause();
  }, [ready]);

  const seek = React.useCallback(
    (seconds: number) => {
      const audio = audioRef.current;
      if (audio && ready) audio.currentTime = seconds;
      setTime(seconds);
    },
    [ready]
  );

  const element = (
    // No captions: the tracks are instrumental.
    // eslint-disable-next-line jsx-a11y/media-has-caption
    <audio
      ref={audioRef}
      src={source.src}
      preload="auto"
      // The browser starts the song over by itself, with no gap.
      loop={repeat === "one"}
      onLoadedMetadata={handleReady}
      onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
      onPlay={() => setPlaying(true)}
      onPause={() => setPlaying(false)}
      onEnded={() => {
        setPlaying(false);
        if (repeat === "next") onNext?.();
      }}
    />
  );

  return {
    element,
    playing,
    ready,
    time,
    duration,
    failed: source.failed,
    toggle,
    seek,
  };
}

interface Props {
  /** The song picked, or none yet. */
  song?: Song;
  audio: JukeboxAudio;
  /** The songs either side of it in the list shown, if any. */
  onPrevious?: () => void;
  onNext?: () => void;
  /** When a song ends: stop, play the next in the list, or play it again. */
  repeat: JukeboxRepeat;
  onRepeatChange: (repeat: JukeboxRepeat) => void;
}

/** Each press of the repeat button moves on one. */
const NEXT_REPEAT: Record<JukeboxRepeat, JukeboxRepeat> = {
  off: "next",
  next: "one",
  one: "off",
};

const REPEAT_LABEL: Record<JukeboxRepeat, string> = {
  off: "Repeat: off",
  next: "Repeat: play the next song",
  one: "Repeat: this song",
};

export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const whole = Math.floor(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

/**
 * The Jukebox's player. It keeps one layout for every song, and knows each
 * song's length before it downloads, so picking another song changes the
 * words and nothing else: the list under it never moves. The repeat button
 * picks what happens when a song ends: it stops, the next song in the list
 * plays, or the same song plays again.
 */
export function JukeboxPlayer({
  song,
  audio,
  onPrevious,
  onNext,
  repeat,
  onRepeatChange,
}: Props) {
  const { playing, ready, time, duration, toggle, failed } = audio;

  const seek = (event: React.ChangeEvent<HTMLInputElement>) =>
    audio.seek(Number(event.target.value));

  const percent =
    duration > 0 ? `${Math.min(time / duration, 1) * 100}%` : "0%";

  return (
    <Styled.Player aria-label="Jukebox player">
      <Styled.PlayerHead>
        <Styled.Art aria-hidden="true">
          <Styled.NoteIcon />
        </Styled.Art>
        <Styled.PlayerMeta>
          <Styled.PlayerName title={song?.name}>
            {song ? song.name : "Pick a song to play it"}
          </Styled.PlayerName>
          <Styled.PlayerArtist>
            {failed
              ? "This track won’t play here."
              : song
              ? `${song.artist} · Theme ${song.themeNo}`
              : "Every song in the game, in full"}
          </Styled.PlayerArtist>
        </Styled.PlayerMeta>
      </Styled.PlayerHead>

      <Styled.PlayerTimeline>
        <Styled.Seek
          type="range"
          min={0}
          max={duration || 1}
          step={0.1}
          value={Math.min(time, duration)}
          onChange={seek}
          disabled={!ready}
          aria-label="Seek"
          aria-valuetext={`${formatTime(time)} of ${formatTime(duration)}`}
        />
        <Styled.Track>
          <Styled.Fill style={{ width: percent }} />
          {song && <Styled.Thumb style={{ left: percent }} />}
        </Styled.Track>
        <Styled.Times>
          <span>{formatTime(time)}</span>
          <span>{song ? formatTime(duration) : "-:--"}</span>
        </Styled.Times>
      </Styled.PlayerTimeline>

      <Styled.PlayerControls>
        <Styled.Skip
          type="button"
          onClick={onPrevious}
          disabled={!onPrevious}
          aria-label="Previous song"
        >
          <Styled.PreviousIcon aria-hidden="true" />
        </Styled.Skip>
        <Styled.Transport
          type="button"
          onClick={toggle}
          disabled={!ready}
          aria-label={playing ? "Pause" : "Play"}
        >
          {playing ? (
            <Styled.PauseIcon aria-hidden="true" />
          ) : (
            <Styled.PlayIcon aria-hidden="true" />
          )}
        </Styled.Transport>
        <Styled.Skip
          type="button"
          onClick={onNext}
          disabled={!onNext}
          aria-label="Next song"
        >
          <Styled.NextIcon aria-hidden="true" />
        </Styled.Skip>
        <Styled.Repeat
          type="button"
          $on={repeat !== "off"}
          onClick={() => onRepeatChange(NEXT_REPEAT[repeat])}
          aria-label={REPEAT_LABEL[repeat]}
          title={REPEAT_LABEL[repeat]}
        >
          {repeat === "one" ? (
            <Styled.RepeatOneIcon aria-hidden="true" />
          ) : (
            <Styled.RepeatIcon aria-hidden="true" />
          )}
        </Styled.Repeat>
        <Styled.PlayerVolume>
          <VolumeControl />
        </Styled.PlayerVolume>
      </Styled.PlayerControls>
    </Styled.Player>
  );
}
