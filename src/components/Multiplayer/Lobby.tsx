import React from "react";
import {
  IoChatbubbleEllipses,
  IoCheckmark,
  IoChevronDown,
  IoChevronUp,
  IoCopyOutline,
  IoDisc,
  IoEnter,
  IoGameController,
  IoGlobe,
  IoKey,
  IoLayers,
  IoLink,
  IoList,
  IoLockClosed,
  IoPlay,
  IoSettingsSharp,
  IoTimer,
} from "react-icons/io5";

import { PAGES } from "../../constants/pages";
import { roomLink, saveRoomSettings } from "../../helpers/roomClient";
import {
  SettingRow,
  settingsRows,
  settingsSummary,
} from "../../helpers/roomView";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import {
  ClientMessage,
  IDLE_MS,
  IDLE_WARN_MS,
  MIN_PLAYERS,
  RoomAccess,
  RoomView,
} from "../../types/room";

import { Button } from "../Button";
import { PlayerCard, roomLook } from "../Profile/PlayerCard";

import { Avatar } from "./PlayerList";
import { SettingsPopUp } from "./SettingsPopUp";
import * as Styled from "./index.styled";
import { useNow, useTickAt } from "./useRoomClock";

interface Props {
  view: RoomView;
  receivedAt: number;
  send: (message: ClientMessage) => void;
  onLeave: () => void;
  /**
   * Opens a player's profile, from their card (docs/room-profiles.md):
   * only signed-in players' cards that the room marks, never one's own.
   */
  onOpenProfile?: (id: string) => void;
}

/** How long a copy button shows it worked. */
const COPIED_MS = 2000;
/** How long Kick waits for its second press. */
const CONFIRM_MS = 3000;

export const ROW_ICONS: Record<
  Exclude<SettingRow["key"], "access">,
  React.ComponentType
> = {
  game: IoGameController,
  albums: IoDisc,
  lines: IoChatbubbleEllipses,
  answers: IoList,
  rounds: IoLayers,
  time: IoTimer,
  start: IoPlay,
  server: IoGlobe,
};

export const ACCESS_ICONS: Record<RoomAccess, React.ComponentType> = {
  open: IoEnter,
  password: IoKey,
  locked: IoLockClosed,
};

/**
 * A room before its game, in the page's middle column clear of the
 * character (the right side kept for a chat later): its ticket, the code
 * to share and the settings (the host changes them, and who can join, in
 * a pop-up); everyone who has joined on their cards, two to a row, with
 * the places still free and for the host a Kick on everyone else's; then
 * Leave and Start, pinned to the foot on a phone. A lobby where nothing
 * happens for IDLE_MS closes, with a warning for its last minute.
 */
export function Lobby({
  view,
  receivedAt,
  send,
  onLeave,
  onOpenProfile,
}: Props) {
  const now = useNow();
  const isHost = view.host === view.you;
  const { settings } = view;
  const [copied, setCopied] = React.useState<"code" | "link" | "failed">();
  const [editing, setEditing] = React.useState(false);
  // Back from the standings before the others: the lobby, waiting for
  // them (or for the standings' time), when the room will be one again.
  const early = view.phase === "over";
  const here = view.players.filter((p) => p.here).length;
  const canStart = !early && here >= MIN_PLAYERS;

  // A host who passes the room on mid-edit can't save any more.
  React.useEffect(() => {
    if (!isHost) setEditing(false);
  }, [isHost]);

  const copy = (text: string, what: "code" | "link") => {
    navigator.clipboard
      .writeText(text)
      .then(() => setCopied(what))
      .catch(() => setCopied("failed"));
  };
  React.useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(undefined), COPIED_MS);
    return () => window.clearTimeout(timer);
  }, [copied]);

  // The room has no timer: the pages tell it the idle time is up. Keyed to
  // the second, as each view's copy of the time differs by the message's
  // travel.
  const closeAt = view.endsIn === null ? null : receivedAt + view.endsIn;
  useTickAt(
    send,
    `idle:${closeAt === null ? "" : Math.round(closeAt / 1000)}`,
    closeAt
  );
  const closesIn = closeAt === null ? IDLE_MS : Math.max(0, closeAt - now);

  const link = roomLink(
    window.location.origin,
    PAGES.multiplayer.path,
    view.code
  );

  return (
    <>
      <Styled.Toasts>
        {copied === "failed" && (
          <Styled.Problem role="alert">
            Couldn&apos;t copy: select the code instead.
          </Styled.Problem>
        )}
        {!early && closesIn <= IDLE_WARN_MS && (
          <Styled.IdleNote role="alert">
            <span>
              Nothing has happened for a while: this room closes in{" "}
              {Math.ceil(closesIn / 1000)}s.
            </span>
            <Styled.Small
              type="button"
              $strong
              onClick={() => send({ t: "stay" })}
            >
              I&apos;m still here
            </Styled.Small>
          </Styled.IdleNote>
        )}
      </Styled.Toasts>

      <Styled.LobbyLayout>
        <RoomTicket
          view={view}
          copied={copied}
          onCopy={(what) => copy(what === "code" ? view.code : link, what)}
          onSettings={isHost && !early ? () => setEditing(true) : undefined}
        />

        <LobbyPlayers
          view={view}
          hint={
            early
              ? "Waiting for the others to finish the results"
              : isHost
              ? here < MIN_PLAYERS
                ? "Share the code: a game needs two"
                : "Start when everyone's in"
              : "Waiting for the host to start"
          }
          onKick={isHost ? (id) => send({ t: "kick", id }) : undefined}
          onOpenProfile={onOpenProfile}
        />

        <Styled.LobbyButtons>
          <Button stroke variant="orange" onClick={onLeave}>
            Leave
          </Button>
          {isHost && (
            <Button
              stroke
              variant="green"
              onClick={() => send({ t: "start" })}
              disabled={!canStart}
            >
              Start
            </Button>
          )}
        </Styled.LobbyButtons>
      </Styled.LobbyLayout>

      {editing && (
        <SettingsPopUp
          settings={settings}
          access={view.access}
          players={view.players.length}
          onClose={() => setEditing(false)}
          onSave={(next, access) => {
            saveRoomSettings(next);
            send({
              t: "settings",
              settings: next,
              ...(access ? { access } : {}),
            });
            setEditing(false);
          }}
        />
      )}
    </>
  );
}

/**
 * The room's ticket: its code on a slanted strip like the game's name
 * plates, with Copy code, Copy link and the host's gear, and under it the
 * settings as chips. On a phone the chips fold into one line, so the
 * players come first.
 */
function RoomTicket({
  view,
  copied,
  onCopy,
  onSettings,
}: {
  view: RoomView;
  copied?: "code" | "link" | "failed";
  onCopy: (what: "code" | "link") => void;
  onSettings?: () => void;
}) {
  const phone = useMediaQuery("(max-width: 600px)");
  const [open, setOpen] = React.useState(false);
  const rows = settingsRows(view.settings, view.access);

  const chips = (
    <Styled.ChipRow aria-label="Room settings" id="room-settings">
      {rows.map((row) => {
        const Icon =
          row.key === "access" ? ACCESS_ICONS[view.access] : ROW_ICONS[row.key];
        return (
          <Styled.SettingChip key={row.key} title={row.label}>
            <Icon aria-hidden="true" />
            <Styled.ChipLabel>{row.label}: </Styled.ChipLabel>
            {row.value}
          </Styled.SettingChip>
        );
      })}
    </Styled.ChipRow>
  );
  const gear = onSettings && (
    <Styled.TicketButton
      type="button"
      onClick={onSettings}
      aria-label="Change the room's settings"
      title="Change settings"
    >
      <IoSettingsSharp aria-hidden="true" />
    </Styled.TicketButton>
  );

  return (
    <Styled.Ticket aria-label="Room">
      <Styled.TicketStrip>
        <Styled.TicketLabel>Room</Styled.TicketLabel>
        <Styled.TicketCode
          aria-label={`Room code ${view.code.split("").join(" ")}`}
        >
          {view.code}
        </Styled.TicketCode>
        <Styled.TicketCopies>
          {(["code", "link"] as const).map((what) => (
            <Styled.TicketButton
              key={what}
              type="button"
              $done={copied === what}
              onClick={() => onCopy(what)}
              aria-label={copied === what ? "Copied" : `Copy ${what}`}
              title={`Copy ${what}`}
            >
              {copied === what ? (
                <IoCheckmark aria-hidden="true" />
              ) : what === "code" ? (
                <IoCopyOutline aria-hidden="true" />
              ) : (
                <IoLink aria-hidden="true" />
              )}
            </Styled.TicketButton>
          ))}
          {gear}
        </Styled.TicketCopies>
      </Styled.TicketStrip>
      {phone ? (
        <>
          <Styled.TicketDetails>
            <Styled.DetailsToggle
              type="button"
              aria-expanded={open}
              aria-controls="room-settings"
              onClick={() => setOpen((was) => !was)}
            >
              <Styled.DetailsLine>
                {settingsSummary(view.settings, view.access).join(" · ")}
              </Styled.DetailsLine>
              <Styled.DetailsWord>
                Details{" "}
                {open ? (
                  <IoChevronUp aria-hidden="true" />
                ) : (
                  <IoChevronDown aria-hidden="true" />
                )}
              </Styled.DetailsWord>
            </Styled.DetailsToggle>
          </Styled.TicketDetails>
          {open && <Styled.TicketChips>{chips}</Styled.TicketChips>}
        </>
      ) : (
        <Styled.TicketChips>{chips}</Styled.TicketChips>
      )}
    </Styled.Ticket>
  );
}

/**
 * Everyone in the room, two to a row in the order they came, and the
 * places still free: each on their card as Customize draws it, with the
 * student they picked; yours dressed as you picked, the others' with the
 * defaults until accounts (see roomLook).
 * For the host, a Kick on everyone else's, pressed twice.
 */
function LobbyPlayers({
  view,
  hint,
  onKick,
  onOpenProfile,
}: {
  view: RoomView;
  hint: string;
  onKick?: (id: string) => void;
  onOpenProfile?: (id: string) => void;
}) {
  const free = Math.max(0, view.settings.maxPlayers - view.players.length);
  const [arming, setArming] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (!arming) return;
    const timer = window.setTimeout(() => setArming(null), CONFIRM_MS);
    return () => window.clearTimeout(timer);
  }, [arming]);

  return (
    <Styled.LobbyPlayers aria-label="Players">
      <Styled.PlayersHead>
        <Styled.PlayersTitle>
          Players{" "}
          <span>
            {view.players.length}/{view.settings.maxPlayers}
          </span>
        </Styled.PlayersTitle>
        <Styled.PlayersHint>{hint}</Styled.PlayersHint>
      </Styled.PlayersHead>
      <Styled.LobbyGrid>
        {view.players.map((player) => {
          const isYou = player.id === view.you;
          const isHost = player.id === view.host;
          // Back from the standings early, or still on them.
          const onResults = view.phase === "over" && !player.returned;
          return (
            <li key={player.id}>
              <PlayerCard
                look={roomLook(
                  player.name,
                  player.icon,
                  player.id === view.you,
                  player.look
                )}
                face={(size) => (
                  <Avatar icon={player.icon} name={player.name} size={size} />
                )}
                you={isYou}
                away={!player.here}
                onOpen={
                  player.profile && player.id !== view.you && onOpenProfile
                    ? () => onOpenProfile(player.id)
                    : undefined
                }
                corner={
                  <>
                    <Styled.LobbyState
                      $host={isHost && player.here}
                      $ready={!isHost && player.here && !onResults}
                    >
                      {!player.here
                        ? "Away"
                        : isHost
                        ? "👑 Host"
                        : onResults
                        ? "On the results"
                        : "Ready"}
                    </Styled.LobbyState>
                    {onKick && !isYou && (
                      <Styled.CardKick
                        type="button"
                        $armed={arming === player.id}
                        aria-label={
                          arming === player.id
                            ? `Tap again to kick ${player.name}`
                            : `Kick ${player.name}`
                        }
                        onClick={() => {
                          if (arming === player.id) {
                            setArming(null);
                            onKick(player.id);
                          } else {
                            setArming(player.id);
                          }
                        }}
                      >
                        {arming === player.id ? "Kick?" : "✕"}
                      </Styled.CardKick>
                    )}
                  </>
                }
              />
            </li>
          );
        })}
        {Array.from({ length: free }, (_, index) => (
          <Styled.FreePlace key={`free-${index}`} aria-hidden="true">
            <span>+</span> Free
          </Styled.FreePlace>
        ))}
      </Styled.LobbyGrid>
    </Styled.LobbyPlayers>
  );
}
