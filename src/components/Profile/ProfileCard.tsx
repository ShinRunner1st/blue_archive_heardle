import React from "react";

import { Banner, Frame, ProfileBackground } from "../../constants/cosmetics";
import { cardTitle, pickedOf } from "../../helpers/cosmetics";
import { pictureName } from "../../helpers/playerName";
import { loadFavStudent } from "../../helpers/storage";
import { Portrait, usePortraits } from "../Portrait";

import { ProfileBanner, WorkerPicture } from "./ProfileBanner";
import { ProfileFrame } from "./ProfileFrame";
import * as Styled from "./index.styled";

/** What a card shows: who, and the cosmetics they picked. */
export interface CardLook {
  name: string;
  /** The favourite student, whose portrait is the picture; or a letter. */
  student: number | null;
  title: string;
  banner: Banner;
  frame: Frame;
  background: ProfileBackground;
}

/** The card as the player has it now. */
export function currentLook(): CardLook {
  const title = cardTitle();
  return {
    name: pictureName() || "Sensei",
    student: loadFavStudent(),
    title: title.mission === undefined ? "Sensei" : title.name,
    banner: pickedOf("banner"),
    frame: pickedOf("frame"),
    background: pickedOf("background"),
  };
}

/**
 * The profile's head, as its mockup has it: the background scene across
 * the top behind Customize and the Sensei card, and over its foot the
 * picture, the name, the title on its banner and a line under it.
 */
export function ProfileHero({
  look,
  actions,
  children,
}: {
  look: CardLook;
  actions: React.ReactNode;
  children?: React.ReactNode;
}) {
  const face = 112;
  return (
    <Styled.Hero>
      <Styled.HeroScene>
        {look.background.picture && (
          <WorkerPicture
            key={look.background.picture}
            picture={look.background.picture}
          />
        )}
      </Styled.HeroScene>
      <Styled.HeroActions>{actions}</Styled.HeroActions>
      <Styled.HeroBody>
        <Styled.HeroFace>
          <Face student={look.student} name={look.name} size={face} />
        </Styled.HeroFace>
        <Styled.HeroText>
          <Styled.HeroName>{look.name}</Styled.HeroName>
          <ProfileBanner banner={look.banner} title={look.title} size="large" />
          {children}
        </Styled.HeroText>
      </Styled.HeroBody>
    </Styled.Hero>
  );
}

/** The favourite student's portrait in a circle, or the name's letter. */
function Face({
  student,
  name,
  size,
}: {
  student: number | null;
  name: string;
  size: number;
}) {
  const portraits = usePortraits(student === null ? [] : [student]);
  const portrait = student === null ? undefined : portraits.get(student);
  return portrait ? (
    <Portrait url={portrait} size={size} />
  ) : (
    <Styled.Letter $size={size}>
      {[...name][0]?.toUpperCase() ?? "S"}
    </Styled.Letter>
  );
}

/**
 * The player's card: their background scene, frame, picture, name and
 * banner, as the profile shows it at its head and Customize previews it,
 * and as a room will show it to the others once accounts arrive.
 */
export function ProfileCard({
  look,
  size = "small",
  children,
}: {
  look: CardLook;
  size?: "small" | "large";
  /** A line or two under the banner. */
  children?: React.ReactNode;
}) {
  const face = size === "large" ? 104 : 64;
  return (
    <ProfileFrame frame={look.frame}>
      <Styled.Card $size={size}>
        {look.background.picture && (
          <Styled.CardScene>
            <WorkerPicture
              key={look.background.picture}
              picture={look.background.picture}
            />
          </Styled.CardScene>
        )}
        <Styled.Face $size={face}>
          <Face student={look.student} name={look.name} size={face} />
        </Styled.Face>
        <Styled.CardText>
          <Styled.CardName $size={size}>{look.name}</Styled.CardName>
          <ProfileBanner banner={look.banner} title={look.title} size={size} />
          {children}
        </Styled.CardText>
      </Styled.Card>
    </ProfileFrame>
  );
}
