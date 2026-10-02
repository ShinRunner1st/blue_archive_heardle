import React from "react";
import { IoClose, IoGift } from "react-icons/io5";

import { unlocksOf } from "../../helpers/cosmetics";
import { MissionToastItem } from "../../hooks/useMissionToasts";

import * as Styled from "./index.styled";

interface Props {
  toast: MissionToastItem;
  onDismiss: () => void;
  /** Opens the Missions pop-up. */
  onOpen: () => void;
  /** What the mission unlocks, when it isn't the game's (the admin tool). */
  unlocks?: string[];
}

/** How long a toast stays, unless the pointer rests on it. */
const SHOW_MS = 5000;

/**
 * "Mission cleared!", floating over the top of the page like the game's own
 * banner, with what it unlocked. A tap opens the missions; it goes by
 * itself after a few seconds.
 */
export function MissionToast({
  toast,
  onDismiss,
  onOpen,
  unlocks: given,
}: Props) {
  const [held, setHeld] = React.useState(false);

  React.useEffect(() => {
    if (held) return;
    const timer = window.setTimeout(onDismiss, SHOW_MS);
    return () => window.clearTimeout(timer);
  }, [toast, held, onDismiss]);

  const unlocks =
    toast.kind === "mission" ? given ?? unlocksOf(toast.mission.id) : [];

  return (
    <Styled.Toast
      role="status"
      aria-live="polite"
      onPointerEnter={() => setHeld(true)}
      onPointerLeave={() => setHeld(false)}
    >
      <Styled.Open
        type="button"
        onClick={() => {
          onDismiss();
          onOpen();
        }}
      >
        <Styled.Label>Mission cleared!</Styled.Label>
        <Styled.Title>
          {toast.kind === "mission"
            ? toast.mission.title
            : `${toast.count} ${
                toast.count === 1 ? "mission" : "missions"
              } already cleared`}
        </Styled.Title>
        {unlocks.length > 0 && (
          <Styled.Unlock>
            <IoGift aria-hidden="true" />
            {unlocks.join(", ")}
          </Styled.Unlock>
        )}
        {toast.kind === "summary" && (
          <Styled.Unlock>See them in ☰ Missions.</Styled.Unlock>
        )}
      </Styled.Open>
      <Styled.Close type="button" aria-label="Close" onClick={onDismiss}>
        <IoClose aria-hidden="true" />
      </Styled.Close>
    </Styled.Toast>
  );
}
