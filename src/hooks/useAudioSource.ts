import React from "react";

import { loadAudio } from "../helpers/audioSource";

interface AudioSource {
  /** A local URL to give the audio element, once the file is in. */
  src?: string;
  failed: boolean;
}

/**
 * Loads `url` whole (see helpers/audioSource) and returns where to play it
 * from. Changing `attempt` loads a failed file again.
 */
export function useAudioSource(url: string, attempt = 0): AudioSource {
  const [state, setState] = React.useState<AudioSource & { key: string }>({
    key: "",
    failed: false,
  });
  const key = `${url}#${attempt}`;

  React.useEffect(() => {
    let live = true;

    loadAudio(url).then(
      (src) => live && setState({ key, src, failed: false }),
      () => live && setState({ key, failed: true })
    );

    return () => {
      live = false;
    };
  }, [url, key]);

  // Nothing from an earlier file or attempt leaks into this one.
  return state.key === key ? state : { failed: false };
}
