import React from "react";
import { IoSettingsSharp } from "react-icons/io5";

import { students } from "../../constants/students";
import {
  loadRoomIcon,
  loadRoomName,
  loadRoomSettings,
  saveRoomIcon,
  saveRoomName,
  saveRoomSettings,
} from "../../helpers/roomClient";
import { settingsSummary } from "../../helpers/roomView";
import { studentById } from "../../helpers/studentRounds";
import { usePlayerName } from "../../hooks/usePlayerName";
import { RoomStatus } from "../../hooks/useRoom";
import {
  AccessChange,
  CODE_LENGTH,
  IDLE_MS,
  isRoomCode,
  MAX_PASSWORD,
  MAX_PLAYERS,
  MAX_ROOM_NAME,
  RoomError,
  RoomSettings,
} from "../../types/room";

import { Button } from "../Button";
import { PopUp } from "../PopUp";
import { StudentListPopUp } from "../StudentGame/StudentListPopUp";

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
}

/**
 * Before a room: a name and a picture, then make a room, with settings
 * picked here first if the player likes, or join one by its code, filled in
 * already when the page was opened from a room's link.
 */
export function Entry({ status, error, linked, onCreate, onJoin }: Props) {
  // The name typed for the last room, or else the one in Settings, to
  // start from: it goes to a room only once the player makes or joins one.
  const saved = usePlayerName();
  const [name, setName] = React.useState(() => loadRoomName() || saved.trim());
  const [icon, setIcon] = React.useState(loadRoomIcon);
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
  const busy = status === "connecting";
  const canJoin = isRoomCode(code) && !busy;

  const pick = (next: number | null) => {
    setIcon(next);
    saveRoomIcon(next);
  };
  const join = (withPassword?: string) => {
    if (!canJoin) return;
    saveRoomName(name);
    setSentPassword(withPassword !== undefined);
    onJoin(code, name, icon, withPassword);
  };
  const create = () => {
    saveRoomName(name);
    onCreate(name, icon, settings, access);
  };

  return (
    <>
      <Styled.Title>Multiplayer 🎮</Styled.Title>
      <Styled.Lead>
        Play the OST, Voice or Picture game with friends, everyone hearing the
        same song at once. One of you makes a room and shares its code.
      </Styled.Lead>

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

      <Styled.Card aria-label="Join or make a room">
        <Styled.Form as="div">
          <Styled.Label htmlFor="room-name">Your name</Styled.Label>
          <Styled.Input
            id="room-name"
            name="room-name"
            autoComplete="off"
            value={name}
            maxLength={MAX_ROOM_NAME}
            placeholder="Sensei"
            onChange={(event) => setName(event.target.value)}
          />
          <Styled.Label as="span">Your picture</Styled.Label>
          <Styled.IconRow>
            <Avatar icon={icon} name={name.trim() || "Sensei"} size={44} />
            <Styled.Small type="button" onClick={() => setPicking(true)}>
              {icon === null ? "Pick a student" : "Change"}
            </Styled.Small>
            {icon !== null && (
              <Styled.Small type="button" onClick={() => pick(null)}>
                Use my letter
              </Styled.Small>
            )}
            <Styled.FieldHint>
              {icon === null
                ? "Or keep your name's first letter."
                : studentById.get(icon)?.name}
            </Styled.FieldHint>
          </Styled.IconRow>
        </Styled.Form>

        <Styled.Divider>Join a friend&apos;s room</Styled.Divider>
        <Styled.JoinRow>
          <Styled.Input
            $code
            aria-label="Room code"
            name="room-code"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            value={code}
            maxLength={CODE_LENGTH}
            placeholder="Code"
            onChange={(event) =>
              setCode(event.target.value.toUpperCase().replace(/[^A-Z]/g, ""))
            }
            onKeyDown={(event) => {
              if (event.key === "Enter") join();
            }}
          />
          <Button
            stroke
            variant="blue"
            onClick={() => join()}
            disabled={!canJoin}
          >
            Join
          </Button>
        </Styled.JoinRow>

        <Styled.Divider>or make your own</Styled.Divider>
        <Styled.NewRoom>
          <Styled.Pills aria-label="Your room's settings">
            {settingsSummary(settings, access.access).map((part, index) => (
              <Styled.Pill key={part} $lead={index === 0}>
                {part}
              </Styled.Pill>
            ))}
          </Styled.Pills>
          <Styled.Buttons style={{ marginTop: 0 }}>
            <Styled.IconButton
              type="button"
              $big
              aria-label="Your room's settings"
              title="Your room's settings"
              onClick={() => setEditing(true)}
              disabled={busy}
            >
              <IoSettingsSharp aria-hidden="true" />
            </Styled.IconButton>
            <Button stroke variant="green" onClick={create} disabled={busy}>
              {busy ? "Connecting…" : "Make a room"}
            </Button>
          </Styled.Buttons>
        </Styled.NewRoom>
      </Styled.Card>

      <Styled.Note>
        Up to {MAX_PLAYERS} players. A room keeps your name and picture only
        while it&apos;s open, and nothing about it is saved.
      </Styled.Note>

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
            pick(id);
            setPicking(false);
          }}
          onClose={() => setPicking(false)}
        />
      )}
    </>
  );
}
