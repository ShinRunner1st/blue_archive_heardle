import React from "react";

import { cardTitle, pickedOf } from "../../helpers/cosmetics";
import { pictureName } from "../../helpers/playerName";
import { loadFavStudent } from "../../helpers/storage";

import { ProfileBanner, WorkerPicture } from "./ProfileBanner";
import { CardLook, Face } from "./PlayerCard";
import * as Styled from "./index.styled";

export type { CardLook };

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
