import React from "react";
import { IoLockClosed } from "react-icons/io5";

import {
  Banner,
  Frame,
  Cosmetic,
  ProfileBackground,
} from "../../constants/cosmetics";
import { MISSIONS } from "../../constants/missions";
import { students } from "../../constants/students";
import {
  COSMETIC_KINDS,
  CosmeticKind,
  isUnlocked,
  offered,
  pickedOf,
  setPicked,
} from "../../helpers/cosmetics";
import { requestProfileSync } from "../../helpers/accountFlag";
import { loadClearedMissions } from "../../helpers/missions";
import {
  getFavStudent,
  getPlayerName,
  getSenseiTitle,
  MAX_PLAYER_NAME,
  pictureName,
  setFavStudent,
  setPlayerName,
  setSenseiTitle,
} from "../../helpers/playerName";
import { studentById } from "../../helpers/studentRounds";

import { Button } from "../Button";
import { PopUp } from "../PopUp";
import { StudentIcon } from "../StudentIcon";
import { StudentSearch } from "../StudentGame/StudentSearch";
import { Switch } from "../Switch";

import { ProfileBanner, WorkerPicture } from "./ProfileBanner";
import { CardLook, currentLook, PlayerCard } from "./PlayerCard";
import { ProfileFrame } from "./ProfileFrame";
import * as Styled from "./index.styled";

/** The kinds Customize offers, in order. Another is an entry here. */
const SECTIONS = ["title", "banner", "frame", "background"] as const;
type Section = (typeof SECTIONS)[number];

/**
 * How each kind's choice looks in its section. A new kind (see
 * COSMETIC_KINDS) needs its swatch here and its place in SECTIONS.
 */
function Swatch({ kind, item }: { kind: Section; item: Cosmetic }) {
  switch (kind) {
    case "title":
      // A list of its own (TitleList), not a swatch.
      return null;
    case "banner":
      // Its own name on it: the title picked would repeat down the list.
      return <ProfileBanner banner={item as Banner} title={item.name} />;
    case "frame":
      return (
        <Styled.FrameSwatch>
          <ProfileFrame frame={item as Frame}>
            <Styled.FrameFill />
          </ProfileFrame>
        </Styled.FrameSwatch>
      );
    case "background": {
      const { picture } = item as ProfileBackground;
      return (
        <Styled.SceneSwatch>
          {picture && <WorkerPicture key={picture} picture={picture} />}
        </Styled.SceneSwatch>
      );
    }
  }
}

const missionTitle = (id: string | undefined) =>
  MISSIONS.find((mission) => mission.id === id)?.title ?? "";

/** Who the player is: their name, and the student on their card. */
interface Who {
  name: string;
  /** Whether "Sensei" follows the name. */
  title: boolean;
  student: number | null;
}

/**
 * Sets the player's name and picture (a favourite student), then picks the
 * profile's title, banner, frame and background, each unlocked by a mission
 * (the locked ones say which), with the card previewed as it will look,
 * kept in sight while the choices scroll: beside them on a wide screen,
 * pinned over them on a phone. Nothing changes until Save.
 */
export function CustomizePopUp({ onClose }: { onClose: () => void }) {
  const cleared = loadClearedMissions();
  const [start] = React.useState<Record<Section, string>>(() => ({
    title: pickedOf("title").id,
    banner: pickedOf("banner").id,
    frame: pickedOf("frame").id,
    background: pickedOf("background").id,
  }));
  const [draft, setDraft] = React.useState(start);
  const [who, setWho] = React.useState<Who>(() => ({
    name: getPlayerName(),
    title: getSenseiTitle(),
    student: getFavStudent(),
  }));
  const find = <K extends CosmeticKind>(kind: K, id: string) =>
    (COSMETIC_KINDS[kind].list as Cosmetic[]).find((item) => item.id === id);

  const base = currentLook();
  const title = find("title", draft.title);
  const look: CardLook = {
    ...base,
    name: pictureName(who.name, who.title) || "Sensei",
    student: who.student,
    title: !title || title.mission === undefined ? "Sensei" : title.name,
    banner: find("banner", draft.banner) as Banner,
    frame: find("frame", draft.frame) as Frame,
    background: find("background", draft.background) as ProfileBackground,
  };

  const save = () => {
    setPlayerName(who.name);
    setSenseiTitle(who.title);
    setFavStudent(who.student);
    // Only what was changed: a pick kept from the account but not yet
    // unlocked here shows as the default, and mustn't be saved over.
    for (const kind of SECTIONS) {
      if (draft[kind] !== start[kind]) setPicked(kind, draft[kind]);
    }
    requestProfileSync();
    onClose();
  };

  return (
    <PopUp
      wide
      title="Customize"
      subtitle="Clear missions to unlock more"
      onClose={onClose}
      actions={
        <>
          <Button stroke variant="orange" onClick={onClose}>
            Cancel
          </Button>
          <Button stroke variant="green" onClick={save}>
            Save
          </Button>
        </>
      }
    >
      <Styled.CustomizeBody>
        <Styled.Preview>
          <Styled.PreviewLabel>Your card</Styled.PreviewLabel>
          <PlayerCard look={look} />
        </Styled.Preview>
        <Styled.Choices>
          <WhoSection
            who={who}
            onChange={(change) =>
              setWho((current) => ({ ...current, ...change }))
            }
          />
          {SECTIONS.map((kind) => {
            const { label, list } = COSMETIC_KINDS[kind];
            const items = offered(list as Cosmetic[], cleared);
            const open = items.filter((item) =>
              isUnlocked(item, cleared)
            ).length;
            const headingId = `customize-${kind}`;
            return (
              <Styled.Section key={kind}>
                <Styled.SectionHead>
                  <Styled.SubHeading id={headingId}>
                    {kind === "title" ? "Title" : label}
                  </Styled.SubHeading>
                  <Styled.SectionCount>
                    {open} of {items.length} unlocked
                  </Styled.SectionCount>
                </Styled.SectionHead>
                {kind === "title" ? (
                  <TitleList
                    items={items}
                    cleared={cleared}
                    picked={draft.title}
                    labelledBy={headingId}
                    onPick={(id) =>
                      setDraft((current) => ({ ...current, title: id }))
                    }
                  />
                ) : (
                  <CosmeticOptions
                    kind={kind}
                    items={items}
                    cleared={cleared}
                    picked={draft[kind]}
                    labelledBy={headingId}
                    onPick={(id) =>
                      setDraft((current) => ({ ...current, [kind]: id }))
                    }
                  />
                )}
              </Styled.Section>
            );
          })}
        </Styled.Choices>
      </Styled.CustomizeBody>
    </PopUp>
  );
}

/**
 * The name, with or without "Sensei" after it, and the student on the card,
 * or the name's letter. Both go to a room the player joins, and the name
 * on the pictures they share.
 */
function WhoSection({
  who,
  onChange,
}: {
  who: Who;
  onChange: (change: Partial<Who>) => void;
}) {
  const nameId = React.useId();
  const student = who.student === null ? null : studentById.get(who.student);
  const picked = React.useMemo(
    () => new Set(who.student === null ? [] : [who.student]),
    [who.student]
  );
  const shown = who.name.trim() || "Arona";
  return (
    <Styled.Section>
      <Styled.SectionHead>
        <Styled.SubHeading>Name and picture</Styled.SubHeading>
        <Styled.SectionCount>On your card and in rooms</Styled.SectionCount>
      </Styled.SectionHead>
      <Styled.WhoFields>
        <Styled.WhoField>
          <Styled.FieldLabel htmlFor={nameId}>Name</Styled.FieldLabel>
          <Styled.NameInput
            id={nameId}
            name="player-name"
            type="text"
            value={who.name}
            onChange={(event) => onChange({ name: event.currentTarget.value })}
            maxLength={MAX_PLAYER_NAME}
            placeholder="Your name"
            autoComplete="off"
            spellCheck={false}
          />
          <Styled.NameToggle
            type="button"
            role="switch"
            aria-checked={who.title}
            onClick={() => onChange({ title: !who.title })}
          >
            <span>
              &ldquo;Sensei&rdquo; after my name
              <Styled.NameExample>
                {pictureName(shown, who.title)}
              </Styled.NameExample>
            </span>
            <Switch $on={who.title} aria-hidden="true" />
          </Styled.NameToggle>
        </Styled.WhoField>
        <Styled.WhoField>
          <Styled.FieldLabel as="span">Picture</Styled.FieldLabel>
          <Styled.PictureRow>
            {student ? (
              <StudentIcon id={student.id} size={36} />
            ) : (
              <Styled.PictureLetter aria-hidden="true">
                {shown.charAt(0).toUpperCase()}
              </Styled.PictureLetter>
            )}
            <Styled.PictureName>
              {student ? student.name : "Your name's first letter"}
            </Styled.PictureName>
            {student && (
              <Styled.PictureRemove
                type="button"
                onClick={() => onChange({ student: null })}
              >
                Remove
              </Styled.PictureRemove>
            )}
          </Styled.PictureRow>
          <Styled.Picker>
            <StudentSearch
              pool={students}
              guessed={picked}
              onGuess={(id) => onChange({ student: id })}
              keyboardEnabled={false}
            />
          </Styled.Picker>
        </Styled.WhoField>
      </Styled.WhoFields>
    </Styled.Section>
  );
}

/**
 * A kind's choices as swatches: each as it looks, its name, and for a
 * locked one the lock and the mission that opens it. Also the admin tool's
 * preview, with its draft's mission titles.
 */
export function CosmeticOptions({
  kind,
  items,
  cleared,
  picked,
  labelledBy,
  onPick,
  titleOf = missionTitle,
}: {
  kind: Exclude<Section, "title">;
  items: Cosmetic[];
  cleared: Iterable<string>;
  picked: string;
  labelledBy: string;
  onPick: (id: string) => void;
  titleOf?: (missionId: string | undefined) => string;
}) {
  return (
    <Styled.Options role="radiogroup" aria-labelledby={labelledBy} $kind={kind}>
      {items.map((item) => {
        const unlocked = isUnlocked(item, cleared);
        const active = picked === item.id;
        return (
          <Styled.Option
            key={item.id}
            type="button"
            role="radio"
            aria-checked={active}
            aria-disabled={!unlocked}
            $active={active}
            title={
              unlocked
                ? item.name
                : `Clear "${titleOf(item.mission)}" to unlock`
            }
            onClick={() => unlocked && onPick(item.id)}
          >
            <Styled.OptionLook $locked={kind === "banner" && !unlocked}>
              <Swatch kind={kind} item={item} />
              {!unlocked && kind !== "banner" && (
                <Styled.Lock>
                  <IoLockClosed aria-hidden="true" />
                  <span>{titleOf(item.mission)}</span>
                </Styled.Lock>
              )}
            </Styled.OptionLook>
            {kind !== "banner" ? (
              <Styled.OptionName>{item.name}</Styled.OptionName>
            ) : (
              // A banner wears its name: a locked one, dimmed, says under it
              // which mission opens it.
              !unlocked && (
                <Styled.OptionName>
                  <IoLockClosed aria-hidden="true" /> {titleOf(item.mission)}
                </Styled.OptionName>
              )
            )}
          </Styled.Option>
        );
      })}
    </Styled.Options>
  );
}

/**
 * The titles as a list, a row each: its words, and for a locked one the
 * lock and the mission that opens it. Words alone read better as rows than
 * as swatches, and the banner they sit on is picked apart.
 */
function TitleList({
  items,
  cleared,
  picked,
  labelledBy,
  onPick,
}: {
  items: Cosmetic[];
  cleared: Iterable<string>;
  picked: string;
  labelledBy: string;
  onPick: (id: string) => void;
}) {
  return (
    <Styled.TitleList role="radiogroup" aria-labelledby={labelledBy}>
      {items.map((item) => {
        const unlocked = isUnlocked(item, cleared);
        const active = picked === item.id;
        return (
          <Styled.TitleRow
            key={item.id}
            type="button"
            role="radio"
            aria-checked={active}
            aria-disabled={!unlocked}
            $active={active}
            onClick={() => unlocked && onPick(item.id)}
          >
            <Styled.Radio $active={active} aria-hidden="true" />
            <Styled.TitleName $locked={!unlocked}>
              {item.mission === undefined ? "Sensei" : item.name}
            </Styled.TitleName>
            {!unlocked && (
              <Styled.TitleLock>
                <IoLockClosed aria-hidden="true" />
                {missionTitle(item.mission)}
              </Styled.TitleLock>
            )}
          </Styled.TitleRow>
        );
      })}
    </Styled.TitleList>
  );
}
