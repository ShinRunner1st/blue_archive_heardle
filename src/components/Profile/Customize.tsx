import React from "react";
import { IoLockClosed } from "react-icons/io5";

import {
  Banner,
  Frame,
  Cosmetic,
  ProfileBackground,
} from "../../constants/cosmetics";
import { MISSIONS } from "../../constants/missions";
import {
  COSMETIC_KINDS,
  CosmeticKind,
  isUnlocked,
  pickedOf,
  setPicked,
} from "../../helpers/cosmetics";
import { loadClearedMissions } from "../../helpers/missions";

import { Button } from "../Button";
import { PopUp } from "../PopUp";

import { ProfileBanner, WorkerPicture } from "./ProfileBanner";
import { CardLook, currentLook, ProfileCard } from "./ProfileCard";
import { ProfileFrame } from "./ProfileFrame";
import * as Styled from "./index.styled";

/** The kinds Customize offers, in order. Another is an entry here. */
const SECTIONS = ["title", "banner", "frame", "background"] as const;
type Section = (typeof SECTIONS)[number];

/**
 * How each kind's choice looks in its section. A new kind (see
 * COSMETIC_KINDS) needs its swatch here and its place in SECTIONS.
 */
function Swatch({
  kind,
  item,
  look,
}: {
  kind: Section;
  item: Cosmetic;
  look: CardLook;
}) {
  switch (kind) {
    case "title":
      // Plain words: the banner it sits on is picked apart, below.
      return (
        <Styled.TitleChip>
          {item.mission === undefined ? "Sensei" : item.name}
        </Styled.TitleChip>
      );
    case "banner":
      return <ProfileBanner banner={item as Banner} title={look.title} />;
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

/**
 * Picks the profile's title, banner, frame and background, each unlocked
 * by a mission (the locked ones say which), with the card previewed as it
 * will look. Nothing changes until Save.
 */
export function CustomizePopUp({ onClose }: { onClose: () => void }) {
  const cleared = loadClearedMissions();
  const [draft, setDraft] = React.useState<Record<Section, string>>(() => ({
    title: pickedOf("title").id,
    banner: pickedOf("banner").id,
    frame: pickedOf("frame").id,
    background: pickedOf("background").id,
  }));
  const find = <K extends CosmeticKind>(kind: K, id: string) =>
    (COSMETIC_KINDS[kind].list as Cosmetic[]).find((item) => item.id === id);

  const base = currentLook();
  const title = find("title", draft.title);
  const look: CardLook = {
    ...base,
    title: !title || title.mission === undefined ? "Sensei" : title.name,
    banner: find("banner", draft.banner) as Banner,
    frame: find("frame", draft.frame) as Frame,
    background: find("background", draft.background) as ProfileBackground,
  };

  const save = () => {
    for (const kind of SECTIONS) setPicked(kind, draft[kind]);
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
      <Styled.Body>
        <Styled.Preview>
          <ProfileCard look={look} />
        </Styled.Preview>
        {SECTIONS.map((kind) => {
          const { label, list } = COSMETIC_KINDS[kind];
          const items = list as Cosmetic[];
          const open = items.filter((item) => isUnlocked(item, cleared)).length;
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
              <Styled.Options
                role="radiogroup"
                aria-labelledby={headingId}
                $kind={kind}
              >
                {items.map((item) => {
                  const unlocked = isUnlocked(item, cleared);
                  const active = draft[kind] === item.id;
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
                          : `Clear "${missionTitle(item.mission)}" to unlock`
                      }
                      onClick={() =>
                        unlocked &&
                        setDraft((current) => ({ ...current, [kind]: item.id }))
                      }
                    >
                      <Styled.OptionLook
                        $locked={kind === "title" && !unlocked}
                      >
                        <Swatch kind={kind} item={item} look={look} />
                        {!unlocked && kind !== "title" && (
                          <Styled.Lock>
                            <IoLockClosed aria-hidden="true" />
                            <span>{missionTitle(item.mission)}</span>
                          </Styled.Lock>
                        )}
                      </Styled.OptionLook>
                      {kind === "title" ? (
                        !unlocked && (
                          <Styled.OptionName>
                            <IoLockClosed aria-hidden="true" />{" "}
                            {missionTitle(item.mission)}
                          </Styled.OptionName>
                        )
                      ) : (
                        <Styled.OptionName>{item.name}</Styled.OptionName>
                      )}
                    </Styled.Option>
                  );
                })}
              </Styled.Options>
            </Styled.Section>
          );
        })}
      </Styled.Body>
    </PopUp>
  );
}
