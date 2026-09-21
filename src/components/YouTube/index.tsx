import React from "react";
import YouTubePlayer from "react-youtube";

import { markUnplayable } from "../../helpers/unplayable";
import { YouTubeReadyEvent } from "../../types/youtube";

import * as Styled from "./index.styled";

interface Props {
  id: string;
  startTime: number;
}

/** Matches the player's own wait before it gives up on a load. */
const READY_TIMEOUT_MS = 12_000;

type Status = "loading" | "ready" | "failed";

export function YouTube({ id, startTime }: Props) {
  const isMobile = window.innerWidth < 768;
  const [status, setStatus] = React.useState<Status>("loading");

  const width = isMobile ? 320 : 560;
  const height = isMobile ? 180 : 315;

  const opts = React.useMemo(
    () => ({
      width: String(width),
      height: String(height),
      playerVars: {
        autoplay: 1 as const,
        playsinline: 1 as const,
      },
    }),
    [width, height]
  );

  // The reveal used to sit behind "Loading the track…" forever when the video
  // would not play, with nothing saying why and no way to hear it at all.
  React.useEffect(() => {
    if (status !== "loading") return;

    const timer = window.setTimeout(
      () => setStatus("failed"),
      READY_TIMEOUT_MS
    );
    return () => window.clearTimeout(timer);
  }, [status, id]);

  const handleReady = React.useCallback(
    (event: YouTubeReadyEvent) => {
      event.target.seekTo(startTime, true);
      event.target.setVolume(20);
      setStatus("ready");
    },
    [startTime]
  );

  const handleError = React.useCallback(() => {
    markUnplayable(id);
    setStatus("failed");
  }, [id]);

  return (
    <Styled.Frame style={{ width, height }}>
      {status === "loading" && (
        <Styled.Placeholder>Loading the track…</Styled.Placeholder>
      )}
      {status === "failed" && (
        <Styled.Fallback>
          <p>This track won’t play here.</p>
          <a
            href={`https://www.youtube.com/watch?v=${id}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Watch it on YouTube
          </a>
        </Styled.Fallback>
      )}
      <YouTubePlayer
        videoId={id}
        opts={opts}
        onReady={handleReady}
        onError={handleError}
      />
    </Styled.Frame>
  );
}
