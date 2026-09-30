import React from "react";

import { PICTURE_SHEETS, SHAPE_SHEETS } from "../../constants/guessSheets";
import { audioBaseUrl } from "../../helpers/audioUrl";
import { loadAudio } from "../../helpers/audioSource";
import { loadIconSheet } from "../../helpers/iconSheet";
import { hideTrackFromMediaSession } from "../../helpers/mediaSession";
import { useAudioVolume } from "../../hooks/useVolume";
import { ClientMessage, RoomView } from "../../types/room";

/** A file on the audio Worker, as the room names it; nothing else is played. */
export function mediaUrl(file: string | undefined): string | null {
  return file && /^(voices\/)?\w+\.ogg$/.test(file)
    ? `${audioBaseUrl()}/${file}`
    : null;
}

/** When the phase's times fall, on this page's clock. */
export interface RoomClock {
  startAt: number | null;
  endAt: number | null;
  maxAt: number | null;
}

export function roomClock(view: RoomView, receivedAt: number): RoomClock {
  const at = (ms: number | null) => (ms === null ? null : receivedAt + ms);
  return {
    startAt: at(view.startsIn),
    endAt: at(view.endsIn),
    maxAt: at(view.maxIn),
  };
}

/**
 * Downloads the round's clip and the next one, and tells the room each is
 * in, so it can start the round once everyone has it. Songs are whole files
 * (1 to 3 MB), so the next one loads while this one plays, as in Anime Music
 * Quiz; a picture game has one sheet for the whole game. Everything is said
 * again after a reconnect, which may have lost it.
 */
export function useRoomMedia(
  view: RoomView,
  send: (message: ClientMessage) => void,
  session: number
): { blobs: Record<string, string> } {
  const { round, settings, current, next } = view;
  const [blobs, setBlobs] = React.useState<Record<string, string>>({});
  const told = React.useRef(new Set<number>());
  React.useEffect(() => {
    told.current = new Set();
  }, [session]);

  const tell = React.useCallback(
    (r: number) => {
      if (told.current.has(r)) return;
      told.current.add(r);
      send({ t: "ready", round: r });
    },
    [send]
  );

  const url = mediaUrl(current?.file);
  const nextUrl = mediaUrl(next?.file);
  React.useEffect(() => {
    let live = true;
    const wanted: Array<[number, string]> = [];
    if (url) wanted.push([round, url]);
    if (nextUrl) wanted.push([round + 1, nextUrl]);
    for (const [r, file] of wanted) {
      loadAudio(file).then(
        (blob) => {
          if (!live) return;
          // Only the two a round needs: older blob addresses get freed.
          setBlobs((kept) =>
            kept[file] ? kept : { [file]: blob, ...pick(kept, wanted) }
          );
          tell(r);
        },
        // Not in: the round starts without this page after the wait, and
        // the page tries again with the next view.
        () => undefined
      );
    }
    return () => {
      live = false;
    };
  }, [url, nextUrl, round, tell, session]);

  // A picture game: the one sheet it needs, loaded once, readies them all.
  const isPicture = settings.game === "picture";
  const layout = (settings.silhouette ? SHAPE_SHEETS : PICTURE_SHEETS)[
    settings.picture
  ];
  const inGame = view.phase !== "lobby" && view.phase !== "over";
  const hasNext = next !== undefined;
  React.useEffect(() => {
    if (!isPicture || !inGame) return;
    let live = true;
    loadIconSheet(layout.key).then((sheet) => {
      if (!live || !sheet) return;
      tell(round);
      if (hasNext) tell(round + 1);
    });
    return () => {
      live = false;
    };
  }, [isPicture, layout.key, inGame, round, hasNext, tell, session]);

  return { blobs };
}

function pick(
  kept: Record<string, string>,
  wanted: Array<[number, string]>
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [, file] of wanted) if (kept[file]) out[file] = kept[file];
  return out;
}

/**
 * Plays the round for everyone at once, from one audio element the page
 * keeps: a song from its start point for the whole time to answer, with no
 * pause or seek, then again from the start at the reveal, playing on while
 * the next one loads; a voice line whole, again at the reveal, and as often
 * as the player likes. A page whose clip came late starts it where everyone
 * else is. A browser that won't play without a tap says so, and a tap on
 * `resume` starts it in the right place.
 */
export function useRoomSound(
  audioRef: React.RefObject<HTMLAudioElement | null>,
  view: RoomView,
  clock: RoomClock,
  blob: string | undefined,
  now: number
) {
  const { phase, round, settings, current } = view;
  const isVoice = settings.game === "voice";
  const start = current?.start ?? 0;
  const [blocked, setBlocked] = React.useState(false);
  const [playing, setPlaying] = React.useState(false);
  /** The round whose line last played through to its end. */
  const [endedRound, setEndedRound] = React.useState<number | null>(null);
  useAudioVolume(audioRef);

  // The clock's times move a little with each view's arrival, so they're
  // read when needed rather than restarting the song on every message.
  const clockRef = React.useRef(clock);
  React.useLayoutEffect(() => {
    clockRef.current = clock;
  });

  /** Where the song should be now: its start, plus the time it has played. */
  const position = React.useCallback(() => {
    if (isVoice) return 0;
    const { startAt } = clockRef.current;
    if (phase !== "playing" || startAt === null) return start;
    return start + Math.max(0, Date.now() - startAt) / 1000;
  }, [isVoice, phase, start]);

  const play = React.useCallback(
    (from: number) => {
      const audio = audioRef.current;
      if (!audio || !blob) return;
      if (audio.src !== blob) audio.src = blob;
      audio.currentTime = from;
      hideTrackFromMediaSession();
      Promise.resolve(audio.play()).then(
        () => setBlocked(false),
        () => setBlocked(true)
      );
    },
    [audioRef, blob]
  );

  React.useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (phase !== "playing" && phase !== "reveal") {
      audio.pause();
      return;
    }
    if (!blob) return;
    if (phase === "reveal") {
      play(isVoice ? 0 : start);
      return;
    }
    const { startAt, endAt } = clockRef.current;
    if (startAt === null || endAt === null) return;
    const timer = window.setTimeout(() => {
      if (Date.now() < clockRef.current.endAt!) play(position());
    }, Math.max(0, startAt - Date.now()));
    return () => window.clearTimeout(timer);
    // Once per round and phase, and when the clip comes in; not per view.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, round, blob]);

  // A song stops when the time to answer is up, cut short or not.
  const { endAt } = clock;
  React.useEffect(() => {
    if (isVoice || phase !== "playing" || endAt === null) return;
    if (now >= endAt) audioRef.current?.pause();
  }, [isVoice, phase, endAt, now, audioRef]);

  // A voice line can be played again once it has played through once this
  // round, so it's heard whole before anyone replays it.
  const canReplay = isVoice && endedRound === round;
  const resume = React.useCallback(() => play(position()), [play, position]);
  const replay = React.useCallback(() => {
    if (canReplay) play(0);
  }, [canReplay, play]);

  return {
    blocked,
    playing,
    resume,
    replay,
    canReplay,
    onPlay: () => setPlaying(true),
    onPause: () => setPlaying(false),
    onEnded: () => {
      setPlaying(false);
      // The last round's line, playing on into this one's first second,
      // doesn't count.
      if (blob && audioRef.current?.src === blob) setEndedRound(round);
    },
  };
}
