import React from "react";
import {
  IoClipboardOutline,
  IoCreateOutline,
  IoImageOutline,
  IoSettingsSharp,
} from "react-icons/io5";

import { students } from "../../constants/students";
import {
  codeIn,
  loadRoomSettings,
  saveRoomIcon,
  saveRoomSettings,
} from "../../helpers/roomClient";
import { settingsRows } from "../../helpers/roomView";
import { useFavStudent, usePlayerName } from "../../hooks/usePlayerName";
import { RoomStatus } from "../../hooks/useRoom";
import {
  AccessChange,
  CODE_LENGTH,
  IDLE_MS,
  isRoomCode,
  MAX_PASSWORD,
  MAX_PLAYERS,
  RoomError,
  RoomSettings,
} from "../../types/room";

import { Button } from "../Button";
import { PopUp } from "../PopUp";
import { PlayerCard, roomLook } from "../Profile/PlayerCard";
import { StudentListPopUp } from "../StudentGame/StudentListPopUp";

import { ACCESS_ICONS, ROW_ICONS } from "./Lobby";
import { Avatar } from "./PlayerList";
import { SettingsPopUp } from "./SettingsPopUp";
import * as Styled from "./index.styled";

const PROBLEMS: Record<RoomError, string> = {
  missing: "There's no room with that code. It may have closed.",
  full: "That room is full.",
  taken: "Couldn't find a free room code. Please try again.",
  version: "The site has been updated. Reload the page to join.",
  idle: `The room closed: nothing had happened in it for ${
    IDLE_MS / 60_000
  } minutes.`,
  kicked: "The host took you out of that room.",
  locked: "That room is locked: the host isn't letting anyone new in.",
  password: "That room has a password: ask the host for it.",
  slow: "Too many rooms or messages from here just now. Wait a minute, then try again.",
  resting:
    "Multiplayer is resting until tomorrow: it runs on a free daily allowance, which has run out. The rest of the site plays on.",
  bad: "Something went wrong with the room.",
};

/** Nobody picked yet: any student may be anyone's picture. */
const NONE = new Set<number>();

/** How long a note about the clipboard stays. */
const NOTE_MS = 3000;

interface Props {
  status: RoomStatus;
  error: RoomError | null;
  /** A room's code from the link that opened the page. */
  linked: string | null;
  onCreate: (
    name: string,
    icon: number | null,
    settings: RoomSettings,
    access: AccessChange
  ) => void;
  onJoin: (
    code: string,
    name: string,
    icon: number | null,
    password?: string
  ) => void;
  /** Opens the profile's Customize, where the name and picture are set. */
  onProfile?: () => void;
}

/**
 * Before a room, laid out as the lobby is: the player's card as a room
 * will show it, a ticket to join a friend's room by its code (filled in
 * already when the page was opened from a room's link, or pasted), and a
 * ticket for a new room with its settings, picked here first if the player
 * likes. The name and picture come from the profile; the picture can be
 * another student's for the rooms of this visit.
 */
export function Entry({
  status,
  error,
  linked,
  onCreate,
  onJoin,
  onProfile,
}: Props) {
  const name = usePlayerName().trim();
  const favourite = useFavStudent();
  // Another student for this visit's rooms; undefined follows the profile.
  const [chosen, setChosen] = React.useState<number | null>();
  const icon = chosen === undefined ? favourite : chosen;
  const [picking, setPicking] = React.useState(false);
  const [settings, setSettings] = React.useState(loadRoomSettings);
  const [editing, setEditing] = React.useState(false);
  // Who can join the room about to be made: kept for this page only, as a
  // password isn't something to leave in the browser.
  const [access, setAccess] = React.useState<AccessChange>({
    access: "open",
  });
  const [code, setCode] = React.useState(
    linked && isRoomCode(linked) ? linked : ""
  );
  const [note, setNote] = React.useState("");
  React.useEffect(() => {
    if (!note) return;
    const timer = window.setTimeout(() => setNote(""), NOTE_MS);
    return () => window.clearTimeout(timer);
  }, [note]);
  // A room that asked for its password: a pop-up asks for it, and stays
  // for another try if it was wrong.
  const [password, setPassword] = React.useState("");
  const [asked, setAsked] = React.useState(false);
  const [sentPassword, setSentPassword] = React.useState(false);
  React.useEffect(() => {
    if (error === "password") setAsked(true);
  }, [error]);
  // The pop-up opens for the password: its box takes the focus from the
  // panel, which the pop-up focuses as it opens (a moment later, so after
  // it however its effects run).
  const passwordRef = React.useRef<HTMLInputElement>(null);
  React.useEffect(() => {
    if (!asked) return;
    const timer = window.setTimeout(() => passwordRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [asked]);
  const codeRef = React.useRef<HTMLInputElement>(null);
  const busy = status === "connecting";
  const canJoin = isRoomCode(code) && !busy;

  const join = (withPassword?: string) => {
    if (!canJoin) return;
    saveRoomIcon(icon);
    setSentPassword(withPassword !== undefined);
    onJoin(code, name, icon, withPassword);
  };
  const create = () => {
    saveRoomIcon(icon);
    onCreate(name, icon, settings, access);
  };

  // Paste reads the clipboard, which the browser may refuse or not offer:
  // the box then takes Ctrl+V, a link as well as a code.
  const paste = () => {
    const ask = navigator.clipboard?.readText?.();
    if (!ask) {
      codeRef.current?.focus();
      setNote("Paste the code into the box.");
      return;
    }
    ask
      .then((text) => {
        const found = codeIn(text);
        if (found) setCode(found);
        else setNote("No room code on the clipboard.");
      })
      .catch(() => {
        codeRef.current?.focus();
        setNote("Couldn't read the clipboard: paste into the box.");
      });
  };

  const shownName = name || "Sensei";
  const rows = settingsRows(settings, access.access);

  return (
    <>
      <Styled.Toasts>
        {status === "failed" && (
          <Styled.Problem role="alert">
            Couldn&apos;t reach the rooms. Multiplayer may be resting until
            tomorrow (it runs on a free daily allowance), or the connection is
            down.
          </Styled.Problem>
        )}
        {/* A password is asked for in its own pop-up, below. */}
        {error && error !== "password" && (
          <Styled.Problem role="alert">{PROBLEMS[error]}</Styled.Problem>
        )}
      </Styled.Toasts>

      <Styled.LobbyLayout>
        <Styled.EntryHead>
          <Styled.EntryTitle>Multiplayer</Styled.EntryTitle>
          <Styled.PlayersHint $start>
            Play the OST, Voice or Picture game with friends, everyone hearing
            the same song at once.
          </Styled.PlayersHint>
        </Styled.EntryHead>

        <Styled.LobbyPlayers aria-label="You">
          <Styled.PlayersHead>
            <Styled.PlayersTitle>You</Styled.PlayersTitle>
            <Styled.YouActions>
              <Styled.Small type="button" onClick={() => setPicking(true)}>
                <IoImageOutline aria-hidden="true" /> Picture
              </Styled.Small>
              {onProfile && (
                <Styled.Small type="button" onClick={onProfile}>
                  <IoCreateOutline aria-hidden="true" /> Edit profile
                </Styled.Small>
              )}
            </Styled.YouActions>
          </Styled.PlayersHead>
          <PlayerCard
            look={roomLook(shownName, icon, true)}
            face={(size) => <Avatar icon={icon} name={shownName} size={size} />}
          />
          <Styled.PlayersHint as="p" $start>
            {chosen === undefined || chosen === favourite ? (
              <>Your name and card come from your profile.</>
            ) : (
              <>
                Another picture for today&apos;s rooms.{" "}
                <Styled.TextButton
                  type="button"
                  onClick={() => setChosen(undefined)}
                >
                  Use your profile&apos;s
                </Styled.TextButton>
              </>
            )}
          </Styled.PlayersHint>
        </Styled.LobbyPlayers>

        <Styled.Ticket aria-label="Join a friend's room">
          <Styled.TicketStrip>
            <Styled.TicketLabel>Join</Styled.TicketLabel>
            <Styled.CodeInput
              ref={codeRef}
              aria-label="Room code"
              name="room-code"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              value={code}
              maxLength={CODE_LENGTH}
              placeholder="CODE"
              onChange={(event) =>
                setCode(event.target.value.toUpperCase().replace(/[^A-Z]/g, ""))
              }
              onPaste={(event) => {
                // A link or a spaced code, longer than the box takes.
                const found = codeIn(event.clipboardData.getData("text"));
                if (found) {
                  event.preventDefault();
                  setCode(found);
                }
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") join();
              }}
            />
            <Styled.TicketCopies>
              <Styled.TicketButton
                type="button"
                onClick={paste}
                aria-label="Paste a code or link"
                title="Paste a code or link"
              >
                <IoClipboardOutline aria-hidden="true" />
              </Styled.TicketButton>
              <Button
                stroke
                variant="green"
                onClick={() => join()}
                disabled={!canJoin}
              >
                Join
              </Button>
            </Styled.TicketCopies>
          </Styled.TicketStrip>
          <Styled.TicketNote role="status" aria-live="polite">
            {note || "Ask a friend for their room's code or link."}
          </Styled.TicketNote>
        </Styled.Ticket>

        <Styled.Ticket aria-label="Make a room">
          <Styled.TicketStrip>
            <Styled.TicketLabel>New room</Styled.TicketLabel>
            <Styled.TicketCopies>
              <Styled.TicketButton
                type="button"
                onClick={() => setEditing(true)}
                disabled={busy}
                aria-label="Your room's settings"
                title="Your room's settings"
              >
                <IoSettingsSharp aria-hidden="true" />
              </Styled.TicketButton>
              <Button stroke variant="green" onClick={create} disabled={busy}>
                {busy ? "Connecting…" : "Make a room"}
              </Button>
            </Styled.TicketCopies>
          </Styled.TicketStrip>
          <Styled.TicketChips>
            <Styled.ChipRow aria-label="Your room's settings">
              {rows.map((row) => {
                const Icon =
                  row.key === "access"
                    ? ACCESS_ICONS[access.access]
                    : ROW_ICONS[row.key];
                return (
                  <Styled.SettingChip key={row.key} title={row.label}>
                    <Icon aria-hidden="true" />
                    <Styled.ChipLabel>{row.label}: </Styled.ChipLabel>
                    {row.value}
                  </Styled.SettingChip>
                );
              })}
            </Styled.ChipRow>
          </Styled.TicketChips>
        </Styled.Ticket>

        <Styled.Note>
          Up to {MAX_PLAYERS} players. A room keeps your name and picture only
          while it&apos;s open, and nothing about it is saved.
        </Styled.Note>
      </Styled.LobbyLayout>

      {editing && (
        <SettingsPopUp
          settings={settings}
          access={access.access}
          players={1}
          beforeRoom
          onClose={() => setEditing(false)}
          onSave={(next, change) => {
            saveRoomSettings(next);
            setSettings(next);
            if (change) {
              setAccess(
                change.access === "password" && !change.password
                  ? access
                  : change
              );
            }
            setEditing(false);
          }}
        />
      )}
      {asked && (
        <PopUp
          title="This room has a password"
          subtitle={`Ask the host of room ${code} for it.`}
          onClose={() => setAsked(false)}
          actions={
            <>
              <Button stroke variant="orange" onClick={() => setAsked(false)}>
                Cancel
              </Button>
              <Button
                stroke
                variant="green"
                disabled={!canJoin || !password.trim()}
                onClick={() => join(password)}
              >
                {busy ? "Joining…" : "Join"}
              </Button>
            </>
          }
        >
          <Styled.Form
            onSubmit={(event) => {
              event.preventDefault();
              if (password.trim()) join(password);
            }}
          >
            <Styled.Input
              aria-label="The room's password"
              name="room-join-password"
              autoComplete="off"
              spellCheck={false}
              ref={passwordRef}
              maxLength={MAX_PASSWORD}
              placeholder="Password"
              aria-invalid={error === "password" && sentPassword}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            {error === "password" && sentPassword && !busy && (
              <Styled.FieldHint role="alert">
                That isn&apos;t the room&apos;s password. Capitals and spaces
                don&apos;t matter.
              </Styled.FieldHint>
            )}
          </Styled.Form>
        </PopUp>
      )}
      {picking && (
        <StudentListPopUp
          pool={students}
          guessed={NONE}
          onPick={(id) => {
            setChosen(id);
            setPicking(false);
          }}
          onClose={() => setPicking(false)}
        />
      )}
    </>
  );
}
