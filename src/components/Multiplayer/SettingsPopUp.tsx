import React from "react";
import { IoCheckmark, IoClose, IoCopyOutline } from "react-icons/io5";
import styled from "styled-components";

import {
  deleteRoomPreset,
  loadRoomPresets,
  MAX_PRESET_NAME,
  presetCode,
  presetName,
  presetWith,
  readPresetCode,
  RoomPreset,
  sameSettings,
  saveRoomPreset,
} from "../../helpers/roomClient";
import { roundsName, settingsSummary } from "../../helpers/roomView";
import {
  AccessChange,
  GUESS_RANGE,
  MAX_PASSWORD,
  PLAYER_RANGE,
  Range,
  RoomAccess,
  ROUND_RANGE,
  RoomSettings,
} from "../../types/room";
import { SERVER_NAMES, SERVERS } from "../../types/server";

import { Button } from "../Button";
import { PopUp } from "../PopUp";
import { Chip } from "../SongListPopUp/index.styled";
import { Slider } from "../VolumeControl/index.styled";

import * as Styled from "./index.styled";

/** The volume's slider, as wide as its field. */
const WideSlider = styled(Slider)`
  && {
    width: 100%;
  }
`;

interface Choice<T> {
  value: T;
  label: string;
}

function Chips<T extends string | boolean>({
  name,
  hint,
  options,
  value,
  onChange,
}: {
  name: string;
  hint: string;
  options: Array<Choice<T>>;
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <Styled.Field>
      <Styled.FieldName>{name}</Styled.FieldName>
      <Styled.FieldHint>{hint}</Styled.FieldHint>
      <Styled.Chips role="group" aria-label={name}>
        {options.map((option) => (
          <Chip
            key={String(option.value)}
            type="button"
            $active={value === option.value}
            aria-pressed={value === option.value}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </Chip>
        ))}
      </Styled.Chips>
    </Styled.Field>
  );
}

/**
 * A number setting: a slider, and a box to type it in, kept in its range
 * once the box is left.
 */
function Numbers({
  id,
  name,
  hint,
  range,
  unit = "",
  value,
  onChange,
}: {
  id: string;
  name: string;
  hint: string;
  range: Range;
  unit?: string;
  value: number;
  onChange: (value: number) => void;
}) {
  const [typed, setTyped] = React.useState(String(value));
  React.useEffect(() => setTyped(String(value)), [value]);
  const clamp = (n: number) =>
    Math.min(range.max, Math.max(range.min, Math.round(n)));
  const span = range.max - range.min;
  const fill = span > 0 ? ((value - range.min) / span) * 100 : 100;

  return (
    <Styled.Field>
      <Styled.FieldName id={`${id}-name`}>{name}</Styled.FieldName>
      <Styled.FieldHint>{hint}</Styled.FieldHint>
      <Styled.RangeRow>
        <WideSlider
          type="range"
          name={id}
          min={range.min}
          max={range.max}
          step={1}
          value={value}
          aria-labelledby={`${id}-name`}
          aria-valuetext={`${value}${unit}`}
          style={{ "--fill": `${fill}%` } as React.CSSProperties}
          onChange={(event) => onChange(Number(event.target.value))}
        />
        <Styled.NumberBox
          type="number"
          name={`${id}-number`}
          inputMode="numeric"
          min={range.min}
          max={range.max}
          value={typed}
          aria-label={`${name}, from ${range.min} to ${range.max}`}
          onChange={(event) => {
            setTyped(event.target.value);
            const n = Number(event.target.value);
            if (
              event.target.value !== "" &&
              Number.isFinite(n) &&
              n >= range.min &&
              n <= range.max
            ) {
              onChange(clamp(n));
            }
          }}
          onBlur={() => {
            const n = Number(typed);
            const next = Number.isFinite(n) && typed !== "" ? clamp(n) : value;
            setTyped(String(next));
            onChange(next);
          }}
        />
      </Styled.RangeRow>
    </Styled.Field>
  );
}

/** How long a preset's copy button shows its tick. */
const COPIED_MS = 2000;

/**
 * Settings saved under a name, kept in this browser: a tap puts them in the
 * pop-up, to save as the room's. The same settings are only ever kept once,
 * so saving them again renames them. Each can be copied as a short code
 * for a friend, who imports it.
 */
function Presets({
  draft,
  onUse,
}: {
  draft: RoomSettings;
  onUse: (settings: RoomSettings) => void;
}) {
  const [presets, setPresets] = React.useState<RoomPreset[]>(loadRoomPresets);
  const [name, setName] = React.useState("");
  const [importing, setImporting] = React.useState(false);
  const [code, setCode] = React.useState("");
  const [badCode, setBadCode] = React.useState(false);
  const [copied, setCopied] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(null), COPIED_MS);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const clean = name.trim() ? presetName(name) : "";
  const holding = presetWith(presets, draft);
  const save = () => {
    if (!clean) return;
    setPresets(saveRoomPreset({ name: clean, settings: draft }));
    setName("");
  };
  const add = () => {
    const preset = readPresetCode(code);
    if (!preset) {
      setBadCode(true);
      return;
    }
    setPresets(saveRoomPreset(preset));
    onUse(preset.settings);
    setImporting(false);
    setCode("");
  };
  const copy = (preset: RoomPreset) => {
    navigator.clipboard
      .writeText(presetCode(preset))
      .then(() => setCopied(preset.name))
      .catch(() => undefined);
  };

  return (
    <Styled.Field>
      <Styled.FieldTop>
        <Styled.FieldName>Presets</Styled.FieldName>
        <Styled.Small
          type="button"
          aria-pressed={importing}
          onClick={() => {
            setImporting(!importing);
            setBadCode(false);
          }}
        >
          Import
        </Styled.Small>
      </Styled.FieldTop>
      <Styled.FieldHint>
        {presets.length > 0
          ? "Tap one to use it; ⧉ copies it for a friend. Kept in this browser."
          : "Save these settings under a name, to use them again later."}
      </Styled.FieldHint>
      {presets.length > 0 && (
        <Styled.PresetList aria-label="Presets">
          {presets.map((preset) => {
            const active = sameSettings(preset.settings, draft);
            return (
              <Styled.PresetItem key={preset.name} $active={active}>
                <Styled.PresetUse
                  type="button"
                  aria-pressed={active}
                  onClick={() => onUse(preset.settings)}
                >
                  <Styled.PresetName>{preset.name}</Styled.PresetName>
                  <Styled.PresetMeta>
                    {settingsSummary(preset.settings).slice(0, 4).join(" · ")}
                  </Styled.PresetMeta>
                </Styled.PresetUse>
                <Styled.PresetIcon
                  type="button"
                  aria-label={`Copy the preset ${preset.name} for a friend`}
                  title="Copy for a friend"
                  onClick={() => copy(preset)}
                >
                  {copied === preset.name ? (
                    <IoCheckmark aria-hidden="true" />
                  ) : (
                    <IoCopyOutline aria-hidden="true" />
                  )}
                </Styled.PresetIcon>
                <Styled.PresetIcon
                  type="button"
                  $danger
                  aria-label={`Delete the preset ${preset.name}`}
                  title="Delete"
                  onClick={() => setPresets(deleteRoomPreset(preset.name))}
                >
                  <IoClose aria-hidden="true" />
                </Styled.PresetIcon>
              </Styled.PresetItem>
            );
          })}
        </Styled.PresetList>
      )}
      {importing ? (
        <Styled.PresetRow>
          <Styled.Input
            name="room-preset-code"
            aria-label="Preset code"
            aria-invalid={badCode}
            autoComplete="off"
            spellCheck={false}
            placeholder={
              badCode ? "That isn't a preset code" : "Paste a preset code"
            }
            value={code}
            onChange={(event) => {
              setCode(event.target.value);
              setBadCode(false);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && code.trim()) {
                event.preventDefault();
                add();
              }
            }}
          />
          <Styled.Small type="button" disabled={!code.trim()} onClick={add}>
            Add
          </Styled.Small>
        </Styled.PresetRow>
      ) : (
        <Styled.PresetRow>
          <Styled.Input
            name="room-preset-name"
            aria-label="Preset name"
            autoComplete="off"
            placeholder={
              holding ? `Saved as ${holding.name}` : "Name these settings"
            }
            maxLength={MAX_PRESET_NAME}
            value={name}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && clean) {
                event.preventDefault();
                save();
              }
            }}
          />
          <Styled.Small
            type="button"
            disabled={!clean || clean === holding?.name}
            onClick={save}
          >
            {holding
              ? "Rename"
              : presets.some((p) => p.name === clean)
              ? "Replace"
              : "Save preset"}
          </Styled.Small>
        </Styled.PresetRow>
      )}
      {badCode && (
        <Styled.FieldHint role="alert">
          That isn&apos;t a preset code: copy it again with its ⧉ button.
        </Styled.FieldHint>
      )}
    </Styled.Field>
  );
}

const ACCESS_HINTS: Record<RoomAccess, string> = {
  open: "Anyone with the code or the link",
  password: "Only with the password you give out",
  locked: "Nobody new; everyone in the room can come back",
};

interface Props {
  settings: RoomSettings;
  /** Who can join now; the password itself never comes back to the page. */
  access: RoomAccess;
  /** Players in the room now: the most can't go under it. */
  players: number;
  /** Before the room is made: nothing is sent, and Save keeps them. */
  beforeRoom?: boolean;
  /** The settings, and who can join if that changed. */
  onSave: (settings: RoomSettings, access?: AccessChange) => void;
  onClose: () => void;
}

/**
 * The host's settings for the room, or for the room about to be made, and
 * who can join it. Nothing is sent while they're changed: Save sends them
 * once, so trying a few costs the room nothing.
 */
export function SettingsPopUp({
  settings,
  access,
  players,
  beforeRoom = false,
  onSave,
  onClose,
}: Props) {
  const [draft, setDraft] = React.useState(settings);
  const [lock, setLock] = React.useState<RoomAccess>(access);
  const [password, setPassword] = React.useState("");
  const set =
    <K extends keyof RoomSettings>(key: K) =>
    (value: RoomSettings[K]) =>
      setDraft((current) => ({ ...current, [key]: value }));
  const { game } = draft;
  // A room with a password keeps it unless a new one is typed.
  const hasPassword = access === "password";
  const typed = password.trim();
  const accessChanged =
    lock !== access || (lock === "password" && typed !== "");
  const needsPassword = lock === "password" && !typed && !hasPassword;
  const changed = !sameSettings(draft, settings) || accessChanged;

  return (
    <PopUp
      title={beforeRoom ? "Your room's settings" : "Room settings"}
      subtitle={
        beforeRoom
          ? "Your room starts with these; you can change them in it too."
          : "Everyone in the room sees them."
      }
      onClose={onClose}
      actions={
        <>
          <Button stroke variant="orange" onClick={onClose}>
            Cancel
          </Button>
          <Button
            stroke
            variant="green"
            disabled={!changed || needsPassword}
            onClick={() =>
              onSave(
                draft,
                accessChanged
                  ? {
                      access: lock,
                      ...(lock === "password" && typed
                        ? { password: typed }
                        : {}),
                    }
                  : undefined
              )
            }
          >
            Save
          </Button>
        </>
      }
    >
      <Styled.SettingsGrid>
        <Styled.Wide>
          <Presets draft={draft} onUse={setDraft} />
        </Styled.Wide>
        <Styled.Wide>
          <Chips
            name="Game"
            hint="Name the song, or the student by voice or picture"
            options={[
              { value: "ost", label: "OST" },
              { value: "voice", label: "Voice" },
              { value: "picture", label: "Picture" },
            ]}
            value={game}
            onChange={set("game")}
          />
        </Styled.Wide>
        {game === "picture" && (
          <>
            <Chips
              name="Picture"
              hint="Whose halo, or whose weapon"
              options={[
                { value: "halo", label: "Halo" },
                { value: "weapon", label: "Weapon" },
              ]}
              value={draft.picture}
              onChange={set("picture")}
            />
            <Chips
              name="Silhouette"
              hint="Only its shape, in white"
              options={[
                { value: false, label: "Off" },
                { value: true, label: "On" },
              ]}
              value={draft.silhouette}
              onChange={set("silhouette")}
            />
          </>
        )}
        <Chips
          name="Answers"
          hint="Type the name, or pick from four"
          options={[
            { value: "typed", label: "Typed" },
            { value: "choice", label: "4-Choice" },
          ]}
          value={draft.answers}
          onChange={set("answers")}
        />
        {game === "ost" ? (
          <Chips
            name="Songs start"
            hint="Anywhere in the song, or at its first note"
            options={[
              { value: "random", label: "Random" },
              { value: "start", label: "From the top" },
            ]}
            value={draft.start}
            onChange={set("start")}
          />
        ) : (
          <Chips
            name="Server"
            hint="Whose students, for this room only"
            options={SERVERS.map((value) => ({
              value,
              label: SERVER_NAMES[value],
            }))}
            value={draft.server}
            onChange={set("server")}
          />
        )}
        <Numbers
          id="room-rounds"
          name={`How many ${roundsName(draft)}`}
          hint={`${ROUND_RANGE.min} to ${ROUND_RANGE.max} in a game`}
          range={ROUND_RANGE}
          value={draft.rounds}
          onChange={set("rounds")}
        />
        <Numbers
          id="room-guess"
          name="Time to answer"
          hint={
            game === "ost"
              ? "Seconds; the song plays all that time"
              : game === "voice"
              ? "Seconds; the line can be played again"
              : "Seconds"
          }
          range={GUESS_RANGE}
          unit="s"
          value={draft.guessSeconds}
          onChange={set("guessSeconds")}
        />
        <Numbers
          id="room-players"
          name="Most players"
          hint={
            players > PLAYER_RANGE.min
              ? `No fewer than the ${players} here`
              : `${PLAYER_RANGE.min} to ${PLAYER_RANGE.max}`
          }
          range={{ ...PLAYER_RANGE, min: Math.max(PLAYER_RANGE.min, players) }}
          value={Math.max(draft.maxPlayers, players)}
          onChange={set("maxPlayers")}
        />
        <Styled.Field>
          <Chips
            name="Who can join"
            hint={ACCESS_HINTS[lock]}
            options={[
              { value: "open", label: "Open" },
              { value: "password", label: "Password" },
              // Locked before anyone's in would keep everyone out.
              ...(beforeRoom
                ? []
                : [{ value: "locked" as const, label: "Locked" }]),
            ]}
            value={lock}
            onChange={setLock}
          />
          {lock === "password" && (
            <Styled.Input
              name="room-password"
              aria-label="Room password"
              autoComplete="off"
              spellCheck={false}
              maxLength={MAX_PASSWORD}
              placeholder={
                hasPassword ? "Keep the password it has" : "Type a password"
              }
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          )}
        </Styled.Field>
      </Styled.SettingsGrid>
    </PopUp>
  );
}
