import React from "react";

import { Banner, Border, ProfileBackground } from "../../constants/cosmetics";
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
  border: Border;
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
    border: pickedOf("border"),
    background: pickedOf("background"),
  };
}

/**
 * The player's card: their background scene, border, picture, name and
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
  const portraits = usePortraits(look.student === null ? [] : [look.student]);
  const portrait =
    look.student === null ? undefined : portraits.get(look.student);
  const face = size === "large" ? 104 : 64;
  return (
    <ProfileFrame border={look.border}>
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
          {portrait ? (
            <Portrait url={portrait} size={face} />
          ) : (
            <Styled.Letter $size={face}>
              {[...look.name][0]?.toUpperCase() ?? "S"}
            </Styled.Letter>
          )}
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
