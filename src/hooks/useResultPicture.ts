import React from "react";

import logo from "../image/BlueArchive-Heardle.png";
import {
  makeResultPicture,
  ResultPictureInput,
} from "../helpers/picture/resultPicture";

/** After the result screen's own entrance, so the drawing doesn't stall it. */
const DRAW_DELAY_MS = 600;

/**
 * The result picture, drawn soon after the round ends rather than on the
 * button press: Safari only opens the share sheet straight after a tap, and
 * drawing first would use that moment up. Returns a getter for the PNG, which
 * draws it on the spot if the press comes first.
 */
export function useResultPicture(
  { mode, round, score, streak }: ResultPictureInput,
  backdrop: string
): () => Promise<Blob> {
  const picture = React.useRef<Promise<Blob> | null>(null);

  const get = React.useCallback(() => {
    picture.current ??= makeResultPicture(
      { mode, round, score, streak },
      { backdrop, logo }
    ).catch((error: unknown) => {
      // Let the next press try again.
      picture.current = null;
      throw error;
    });
    return picture.current;
  }, [mode, round, score, streak, backdrop]);

  React.useEffect(() => {
    picture.current = null;
    const timer = window.setTimeout(() => {
      get().catch(() => {});
    }, DRAW_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [get]);

  return get;
}
