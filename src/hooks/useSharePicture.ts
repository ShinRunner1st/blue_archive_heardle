import React from "react";

import { sharePicture } from "../helpers/picture/share";
import { usePictureName } from "./usePlayerName";

/** After the screen's own entrance, so the drawing doesn't stall it. */
const DRAW_DELAY_MS = 600;

const DRAWING = "Drawing…";

/**
 * A button that shares a picture. The picture is drawn soon after the button
 * appears rather than on the press: Safari only opens the share sheet straight
 * after a tap, and drawing first would use that moment up. A press that comes
 * first draws it on the spot.
 *
 * `make` must keep its identity while the picture stays the same (useCallback),
 * since a new one throws the drawn picture away.
 */
export function useSharePicture(
  label: string,
  make: () => Promise<Blob>,
  fileName: string,
  text: string
): { text: string; share: () => void } {
  const picture = React.useRef<Promise<Blob> | null>(null);
  const [buttonText, setButtonText] = React.useState(label);

  const get = React.useCallback(() => {
    picture.current ??= make().catch((error: unknown) => {
      // Let the next press try again.
      picture.current = null;
      throw error;
    });
    return picture.current;
  }, [make]);

  // Drawn again when the name for pictures changes in Settings.
  const name = usePictureName();
  React.useEffect(() => {
    picture.current = null;
    const timer = window.setTimeout(() => {
      get().catch(() => {});
    }, DRAW_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [get, name]);

  // A result stays up for a moment, then the button reads as before.
  React.useEffect(() => {
    if (buttonText === label || buttonText === DRAWING) return;
    const timer = window.setTimeout(() => setButtonText(label), 2000);
    return () => window.clearTimeout(timer);
  }, [buttonText, label]);

  const share = () => {
    setButtonText(DRAWING);
    get()
      .then((blob) => sharePicture(blob, fileName, text))
      .then((outcome) =>
        setButtonText(outcome === "saved" ? "Saved to your downloads" : label)
      )
      .catch(() => setButtonText("Couldn't draw the picture"));
  };

  return { text: buttonText, share };
}
