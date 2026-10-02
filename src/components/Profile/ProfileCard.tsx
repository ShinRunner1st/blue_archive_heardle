import React from "react";

import { ProfileBanner, WorkerPicture } from "./ProfileBanner";
import { NameInk } from "./Drift";
import { BackgroundDrift, CardLook, Face } from "./PlayerCard";
import * as Styled from "./index.styled";

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
        {look.background.picture && (
          <BackgroundDrift background={look.background} />
        )}
      </Styled.HeroScene>
      <Styled.HeroActions>{actions}</Styled.HeroActions>
      <Styled.HeroBody>
        <Styled.HeroFace>
          <Face student={look.student} name={look.name} size={face} />
        </Styled.HeroFace>
        <Styled.HeroText>
          <Styled.HeroName>
            <NameInk effect={look.nameEffect}>{look.name}</NameInk>
          </Styled.HeroName>
          <ProfileBanner banner={look.banner} title={look.title} size="large" />
          {children}
        </Styled.HeroText>
      </Styled.HeroBody>
    </Styled.Hero>
  );
}
