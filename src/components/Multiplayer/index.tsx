import React from "react";

import {
  hasRoomToken,
  loadRoomIcon,
  loadRoomSettings,
  roomInAddress,
  roomName,
} from "../../helpers/roomClient";
import { recordRoomGame } from "../../helpers/missions";
import { prepareRoomPass } from "../../helpers/roomPass";
import { PROFILE_GAP_MS } from "../../helpers/room";
import { places } from "../../helpers/roomView";
import { useRoom } from "../../hooks/useRoom";
import { isRoomCode, RoomHold, RoomNudge } from "../../types/room";

import { Entry } from "./Entry";
import { Lobby } from "./Lobby";
import { RoomProfile, RoomProfileState } from "./RoomProfile";
import { RoundScreen } from "./RoundScreen";
import { Standings } from "./Standings";
import * as Styled from "./index.styled";

interface Props {
  /** False while a dialog is open, so the game's keys stay inert. */
  keyboardEnabled: boolean;
  /** Says whether the page should hold the player here (see RoomHold). */
  onHold?: (hold: RoomHold) => void;
  /** Something pressed while held, to say why nothing happened. */
  nudge?: RoomNudge;
  /** Opens the profile's Customize: the name and picture rooms use. */
  onProfile?: () => void;
}

/** How long the note saying why stays. */
const NUDGE_MS = 3000;

/** How long a profile's ticket is waited for before saying it failed. */
const ASK_MS = 6000;

const NUDGES: Record<RoomNudge["why"], string> = {
  leave: "You're in a room: press Leave to go.",
  jukebox: "The Jukebox opens again once the game is over.",
};

/**
 * Multiplayer: private rooms where friends play the OST, Voice or Picture game
 * together, run by the rooms Worker (rooms-worker/). Loaded only on its own
 * page, which is the only place that connects to a room; leaving the page
 * leaves the room.
 */
export default function Multiplayer({
  keyboardEnabled,
  onHold,
  nudge,
  onProfile,
}: Props) {
  const room = useRoom();
  const { view, status, send, join, rejoin, create, leave, profileTicket } =
    room;
  // Signed in: the room pass asked for now, so joining needn't wait.
  React.useEffect(prepareRoomPass, []);

  // In a room, the page holds the player there; in a game's rounds, the
  // browser asks before a reload or a closed tab too (on a computer:
  // phones mostly don't).
  const hold: RoomHold = !view
    ? null
    : view.phase === "lobby" || view.phase === "over"
    ? "room"
    : "game";
  React.useEffect(() => onHold?.(hold), [hold, onHold]);
  React.useEffect(() => () => onHold?.(null), [onHold]);
  React.useEffect(() => {
    if (hold !== "game") return;
    const ask = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", ask);
    return () => window.removeEventListener("beforeunload", ask);
  }, [hold]);

  // A game this page saw played, counted once at its standings for the
  // missions; only in this browser. A reload on the standings doesn't
  // count it again, as the page didn't see it played.
  const playedHere = React.useRef(false);
  React.useEffect(() => {
    if (!view) return;
    if (view.phase !== "lobby" && view.phase !== "over") {
      playedHere.current = true;
    } else if (view.phase === "over" && playedHere.current) {
      playedHere.current = false;
      const me = view.players.find((player) => player.id === view.you);
      recordRoomGame(
        view.players.length > 1 &&
          (me?.score ?? 0) > 0 &&
          places(view.players).get(view.you) === 1
      );
    } else if (view.phase === "lobby") {
      playedHere.current = false;
    }
  }, [view]);

  const [shownNudge, setShownNudge] = React.useState<RoomNudge>();
  React.useEffect(() => {
    if (!nudge) return;
    setShownNudge(nudge);
    const timer = window.setTimeout(() => setShownNudge(undefined), NUDGE_MS);
    return () => window.clearTimeout(timer);
  }, [nudge]);
  // Read once: the room's code in the link that opened the page.
  const [linked] = React.useState(roomInAddress);

  // A reload of a room this tab was in goes straight back in, as the same
  // player (or makes it again, if it closed meanwhile); a link to a new one
  // waits for a name first.
  React.useEffect(() => {
    if (linked && isRoomCode(linked) && hasRoomToken(linked)) {
      rejoin(linked, roomName(linked), loadRoomIcon(), loadRoomSettings());
    }
  }, [linked, rejoin]);

  // Profiles from a card (docs/room-profiles.md): each kept for as long
  // as this page is in the room, so the same card again asks for nothing.
  const [profiles, setProfiles] = React.useState<
    Record<string, RoomProfileState>
  >({});
  const [viewing, setViewing] = React.useState<string | null>(null);
  const code = view?.code;
  React.useEffect(() => {
    setProfiles({});
    setViewing(null);
  }, [code]);
  // The room takes one ask a second from a page: a quicker one waits.
  const askedAt = React.useRef(0);
  const askProfile = React.useCallback(
    (id: string) => {
      setProfiles((kept) => ({ ...kept, [id]: { status: "loading" } }));
      const wait = Math.max(0, askedAt.current + PROFILE_GAP_MS - Date.now());
      askedAt.current = Date.now() + wait;
      window.setTimeout(() => send({ t: "profile", id }), wait);
      window.setTimeout(
        () =>
          setProfiles((kept) =>
            kept[id]?.status === "loading"
              ? { ...kept, [id]: { status: "failed" } }
              : kept
          ),
        wait + ASK_MS
      );
    },
    [send]
  );
  const openProfile = React.useCallback(
    (id: string) => {
      setViewing(id);
      const kept = profiles[id];
      if (!kept || kept.status === "failed") askProfile(id);
    },
    [profiles, askProfile]
  );
  // The room's ticket, taken to the accounts Worker for the profile.
  React.useEffect(() => {
    if (!profileTicket) return;
    const { id, ticket } = profileTicket;
    import("../../helpers/accountClient")
      .then(({ fetchProfileView }) => fetchProfileView(ticket))
      .then((answer) =>
        setProfiles((kept) => ({
          ...kept,
          [id]: answer ? { status: "shown", answer } : { status: "hidden" },
        }))
      )
      .catch(() =>
        setProfiles((kept) => ({ ...kept, [id]: { status: "failed" } }))
      );
  }, [profileTicket]);
  const viewed = viewing
    ? view?.players.find((player) => player.id === viewing)
    : undefined;

  // Gone back from the standings before the room: the lobby, for them.
  const backEarly = Boolean(
    view?.players.find((p) => p.id === view.you)?.returned
  );
  const screen = !view
    ? "entry"
    : view.phase === "lobby" || (view.phase === "over" && backEarly)
    ? "lobby"
    : view.phase === "over"
    ? "standings"
    : "round";

  // Each screen starts at its top: the entry is taller than a phone, and
  // the lobby after it would open scrolled down, off its middle.
  const topRef = React.useRef<HTMLSpanElement>(null);
  React.useLayoutEffect(() => {
    const area = scrollParent(topRef.current);
    if (area) area.scrollTop = 0;
  }, [screen]);
  const top = <Styled.ScrollTop ref={topRef} aria-hidden="true" />;

  if (!view) {
    return (
      <>
        {top}
        <Entry
          status={status}
          error={room.error}
          linked={linked}
          onCreate={create}
          onJoin={join}
          onProfile={onProfile}
        />
      </>
    );
  }

  return (
    <>
      {top}
      <Styled.Toasts>
        {shownNudge && (
          <Styled.Problem role="status" key={shownNudge.n}>
            {NUDGES[shownNudge.why]}
          </Styled.Problem>
        )}
        {status === "connecting" && (
          <Styled.Problem role="status">Reconnecting…</Styled.Problem>
        )}
        {status === "failed" && (
          <Styled.Problem role="alert">
            Lost the room. Your connection may have dropped, or
            Multiplayer&apos;s free daily allowance may have run out. Try again
            tomorrow.
          </Styled.Problem>
        )}
      </Styled.Toasts>
      {screen === "lobby" ? (
        <Lobby
          view={view}
          receivedAt={room.receivedAt}
          send={send}
          onLeave={leave}
          onOpenProfile={openProfile}
        />
      ) : screen === "standings" ? (
        <Standings
          view={view}
          receivedAt={room.receivedAt}
          send={send}
          onLeave={leave}
          onOpenProfile={openProfile}
        />
      ) : (
        <RoundScreen
          view={view}
          receivedAt={room.receivedAt}
          session={room.session}
          send={send}
          onLeave={leave}
          keyboardEnabled={keyboardEnabled}
        />
      )}
      {viewed && viewing && profiles[viewing] && (
        <RoomProfile
          player={viewed}
          state={profiles[viewing]}
          onRetry={() => askProfile(viewing)}
          onClose={() => setViewing(null)}
        />
      )}
    </>
  );
}

/** The nearest box around an element that scrolls: the play area. */
function scrollParent(element: HTMLElement | null): HTMLElement | null {
  for (let at = element?.parentElement; at; at = at.parentElement) {
    if (/(auto|scroll)/.test(getComputedStyle(at).overflowY)) return at;
  }
  return null;
}
