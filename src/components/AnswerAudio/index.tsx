import React from "react";

import { AUDIO_VOLUME } from "../../constants/game";
import { getAudioUrl } from "../../helpers/audioUrl";
import { markUnplayable } from "../../helpers/unplayable";

import * as Styled from "./index.styled";

interface Props {
  themeNo: string;
  startTime: number;
}

/**
 * Plays the answer on the result screen, picking up where the round's clip
 * started, with the browser's own controls so it can be scrubbed freely.
 */
export function AnswerAudio({ themeNo, startTime }: Props) {
  const [failed, setFailed] = React.useState(false);

  const handleReady = React.useCallback(
    (event: React.SyntheticEvent<HTMLAudioElement>) => {
      const audio = event.currentTarget;
      audio.currentTime = startTime;
      audio.volume = AUDIO_VOLUME;

      // Allowed straight after the guess that revealed the answer. On a
      // reload the browser may block it, and the controls are there instead.
      Promise.resolve(audio.play()).catch(() => undefined);
    },
    [startTime]
  );

  const handleError = React.useCallback(() => {
    markUnplayable(themeNo);
    setFailed(true);
  }, [themeNo]);

  return (
    <Styled.Frame>
      {failed ? (
        <Styled.Fallback>This track won’t play here.</Styled.Fallback>
      ) : (
        // No captions: the tracks are instrumental.
        // eslint-disable-next-line jsx-a11y/media-has-caption
        <audio
          controls
          preload="metadata"
          src={getAudioUrl(themeNo)}
          onLoadedMetadata={handleReady}
          onError={handleError}
        />
      )}
    </Styled.Frame>
  );
}
