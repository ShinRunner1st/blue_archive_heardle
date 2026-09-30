import React from "react";
import { IoSettingsSharp } from "react-icons/io5";

import { PAGES } from "../../constants/pages";
import { roomLink, saveRoomSettings } from "../../helpers/roomClient";
import { settingsSummary } from "../../helpers/roomView";
import {
  ClientMessage,
  IDLE_MS,
  IDLE_WARN_MS,
  MIN_PLAYERS,
  RoomView,
} from "../../types/room";

import { Button } from "../Button";

import { PlayerList } from "./PlayerList";
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

/**
 * A room before its game: the code to share, the settings in a few words
 * (the host changes them, and who can join, in a pop-up), and everyone who
 * has joined, with the places still free; the host can kick a player. A
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
  const summary = settingsSummary(settings);

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
      <Styled.Title>Room</Styled.Title>
      <Styled.CodeCard aria-label="Room code">
        <Styled.CodeBlock>
          <Styled.CodeLabel>
            Room code
            {view.access === "password"
              ? " · 🔑 password"
              : view.access === "locked"
              ? " · 🔒 locked"
              : ""}
          </Styled.CodeLabel>
          <Styled.CodeText
            aria-label={`Room code ${view.code.split("").join(" ")}`}
          >
            {view.code}
          </Styled.CodeText>
        </Styled.CodeBlock>
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
      </Styled.CodeCard>

      <Styled.Summary aria-label="Room settings">
        <Styled.Pills>
          {summary.map((part, index) => (
            <Styled.Pill key={part} $lead={index === 0}>
              {part}
            </Styled.Pill>
          ))}
        </Styled.Pills>
        {isHost && !early && (
          <Styled.IconButton
            type="button"
            $small
            aria-label="Room settings"
            title="Room settings"
            onClick={() => setEditing(true)}
          >
            <IoSettingsSharp aria-hidden="true" />
          </Styled.IconButton>
        )}
      </Styled.Summary>

      <PlayerList
        view={view}
        lobby
        onKick={isHost ? (id) => send({ t: "kick", id }) : undefined}
      />

      <Styled.Buttons>
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
      </Styled.Buttons>

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
