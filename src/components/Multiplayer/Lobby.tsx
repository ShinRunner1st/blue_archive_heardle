import React from "react";
import {
  IoChatbubbleEllipses,
  IoDisc,
  IoEnter,
  IoGameController,
  IoGlobe,
  IoKey,
  IoLayers,
  IoList,
  IoLockClosed,
  IoPlay,
  IoTimer,
} from "react-icons/io5";

import { PAGES } from "../../constants/pages";
import { backupUrlFor } from "../../helpers/audioUrl";
import { roomLink, saveRoomSettings } from "../../helpers/roomClient";
import { SettingRow, settingsRows } from "../../helpers/roomView";
import {
  ClientMessage,
  IDLE_MS,
  IDLE_WARN_MS,
  MIN_PLAYERS,
  RoomAccess,
  RoomView,
} from "../../types/room";

import { Button } from "../Button";
import { usePortraits } from "../Portrait";

import { Avatar, hueOf } from "./PlayerList";
import { SettingsPopUp } from "./SettingsPopUp";
import * as Styled from "./index.styled";
import { useNow, useTickAt } from "./useRoomClock";

interface Props {
  view: RoomView;
  receivedAt: number;
  send: (message: ClientMessage) => void;
  onLeave: () => void;
}

/** How long a copy button shows it worked. */
const COPIED_MS = 2000;
/** How long Kick waits for its second press. */
const CONFIRM_MS = 3000;

const ROW_ICONS: Record<
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

const ACCESS_ICONS: Record<RoomAccess, React.ComponentType> = {
  open: IoEnter,
  password: IoKey,
  locked: IoLockClosed,
};

/**
 * A room before its game: on the left its panel, the code to share, the
 * settings a row each (the host changes them, and who can join, in a
 * pop-up) and Start; on the right everyone who has joined, with the
 * places still free, and for the host a Kick on everyone else's card. A
 * lobby where nothing happens for IDLE_MS closes, with a warning for its
 * last minute.
 */
export function Lobby({ view, receivedAt, send, onLeave }: Props) {
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
        <Styled.RoomPanel aria-label="Room">
          <Styled.PanelCode>
            <Styled.CodeLabel>Room code</Styled.CodeLabel>
            <Styled.BigCode
              aria-label={`Room code ${view.code.split("").join(" ")}`}
            >
              {view.code}
            </Styled.BigCode>
          </Styled.PanelCode>
          <Styled.CopyRow>
            <Styled.Small
              type="button"
              $strong={copied === "code"}
              onClick={() => copy(view.code, "code")}
            >
              {copied === "code" ? "Copied ✓" : "Copy code"}
            </Styled.Small>
            <Styled.Small
              type="button"
              $strong={copied === "link"}
              onClick={() => copy(link, "link")}
            >
              {copied === "link" ? "Copied ✓" : "Copy link"}
            </Styled.Small>
          </Styled.CopyRow>

          <Styled.SettingList aria-label="Room settings">
            {settingsRows(settings, view.access).map((row) => {
              const Icon =
                row.key === "access"
                  ? ACCESS_ICONS[view.access]
                  : ROW_ICONS[row.key];
              return (
                <Styled.SettingItem key={row.key}>
                  <Styled.SettingIcon aria-hidden="true">
                    <Icon />
                  </Styled.SettingIcon>
                  <Styled.SettingLabel>{row.label}</Styled.SettingLabel>
                  <Styled.SettingValue>{row.value}</Styled.SettingValue>
                </Styled.SettingItem>
              );
            })}
          </Styled.SettingList>

          {isHost && !early && (
            <Styled.Small type="button" onClick={() => setEditing(true)}>
              Change settings
            </Styled.Small>
          )}
        </Styled.RoomPanel>

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
 * Everyone in the room as wide cards, in the order they came, and the
 * places still free: each with the student the player picked faded in
 * behind it (a portrait, about 7.5 KB, cached for a year). For the host, a
 * Kick on everyone else's, pressed twice.
 */
function LobbyPlayers({
  view,
  hint,
  onKick,
}: {
  view: RoomView;
  hint: string;
  onKick?: (id: string) => void;
}) {
  const free = Math.max(0, view.settings.maxPlayers - view.players.length);
  const portraits = usePortraits(
    view.players.flatMap(({ icon }) => (icon === null ? [] : [icon]))
  );
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
          const art =
            player.icon === null ? undefined : portraits.get(player.icon);
          return (
            <Styled.LobbyCard
              key={player.id}
              $you={isYou}
              $away={!player.here}
              $hue={player.icon === null ? hueOf(player.name) : undefined}
            >
              {art && <CardArt url={art} />}
              <Avatar icon={player.icon} name={player.name} size={64} />
              <Styled.LobbyCardText>
                <Styled.LobbyName title={player.name}>
                  {player.name} {isYou && <small>(you)</small>}
                </Styled.LobbyName>
              </Styled.LobbyCardText>
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
            </Styled.LobbyCard>
          );
        })}
        {Array.from({ length: free }, (_, index) => (
          <Styled.LobbyCard key={`free-${index}`} $empty aria-hidden="true">
            <Styled.FreeCircle>+</Styled.FreeCircle>
            <Styled.LobbyName>Free place</Styled.LobbyName>
          </Styled.LobbyCard>
        ))}
      </Styled.LobbyGrid>
    </Styled.LobbyPlayers>
  );
}

/**
 * A portrait behind a card, from its copy on R2 if the Worker fails; gone
 * if both do. Decorative: the name is on the card.
 */
function CardArt({ url }: { url: string }) {
  const [src, setSrc] = React.useState(url);
  const [failed, setFailed] = React.useState(false);
  if (failed) return null;
  return (
    <Styled.CardArt
      src={src}
      alt=""
      loading="lazy"
      onError={() => {
        const backup = backupUrlFor(url);
        if (backup && src !== backup) setSrc(backup);
        else setFailed(true);
      }}
    />
  );
}
