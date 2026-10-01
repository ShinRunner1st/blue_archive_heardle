import React from "react";

import {
  Banner,
  BACKGROUNDS,
  BANNERS,
  Frame,
  FRAMES,
  ProfileBackground,
} from "../../constants/cosmetics";
import { backupUrlFor } from "../../helpers/audioUrl";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import { Portrait, usePortraits } from "../Portrait";

import { ProfileBanner, WorkerPicture } from "./ProfileBanner";
import { ProfileFrame } from "./ProfileFrame";
import * as Styled from "./card.styled";

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

/**
 * Someone else's card in a room: their name and student, with the default
 * title, banner, frame and background. A room can check that a cosmetic
 * exists but not that its player unlocked it, so everyone's wait for
 * accounts.
 */
export function defaultLook(name: string, student: number | null): CardLook {
  return {
    name,
    student,
    title: "Sensei",
    banner: BANNERS[0],
    frame: FRAMES[0],
    background: BACKGROUNDS[0],
  };
}

/** The face's size on each shape of card, and on a phone's wide one. */
const FACE: Record<Styled.CardVariant, number> = {
  wide: 64,
  mini: 34,
  tall: 52,
  row: 28,
};
const PHONE_FACE = 42;

interface Props {
  look: CardLook;
  variant?: Styled.CardVariant;
  /**
   * In place of the student's portrait in a circle: a room draws its
   * players' icons, or a letter in a colour of their name's.
   */
  face?: (size: number) => React.ReactNode;
  /** The face's size on a tall card, the first place's bigger. */
  faceSize?: number;
  /** The top corner: Host or Ready, a medal. */
  corner?: React.ReactNode;
  /** The right side: a score. */
  aside?: React.ReactNode;
  /** Under the name: on a wide card under the banner, else in its place. */
  line?: React.ReactNode;
  /** Before the face, as a place in the standings. */
  lead?: React.ReactNode;
  you?: boolean;
  away?: boolean;
  /** A round's mark: right, wrong, or none. */
  right?: boolean | null;
  /** Over the card, as the host's Kick. */
  children?: React.ReactNode;
}

/**
 * The player's card: their background scene (or their student's portrait
 * faded in), frame, picture, name and banner. One card in every shape, so
 * Customize previews what the lobby, the rounds and the standings show.
 */
export function PlayerCard({
  look,
  variant = "wide",
  face,
  faceSize,
  corner,
  aside,
  line,
  lead,
  you = false,
  away = false,
  right = null,
  children,
}: Props) {
  const phone = useMediaQuery("(max-width: 600px)");
  const size =
    faceSize ?? (variant === "wide" && phone ? PHONE_FACE : FACE[variant]);
  const ring =
    right === true
      ? "#4DBB60"
      : right === false
      ? "#FF4D4D"
      : you
      ? "#128AFA"
      : undefined;

  return (
    <Styled.CardWrap $away={away} $ring={ring}>
      <ProfileFrame frame={look.frame}>
        <Styled.Card $variant={variant}>
          <CardBack look={look} variant={variant} />
          {lead}
          <Styled.Face $size={size}>
            {face ? (
              face(size)
            ) : (
              <Face student={look.student} name={look.name} size={size} />
            )}
          </Styled.Face>
          <Styled.CardText $variant={variant}>
            <Styled.CardName
              $variant={variant}
              $room={variant === "wide" && corner !== undefined}
              title={look.name}
            >
              {look.name}
              {you && variant === "wide" && <small> (you)</small>}
            </Styled.CardName>
            {variant === "wide" && (
              <ProfileBanner banner={look.banner} title={look.title} />
            )}
            {line}
          </Styled.CardText>
          {aside && <Styled.CardAside>{aside}</Styled.CardAside>}
          {corner && <Styled.CardCorner>{corner}</Styled.CardCorner>}
          {children}
        </Styled.Card>
      </ProfileFrame>
    </Styled.CardWrap>
  );
}

/** The scene picked, or with none, the student's portrait faded in. */
function CardBack({
  look,
  variant,
}: {
  look: CardLook;
  variant: Styled.CardVariant;
}) {
  const portraits = usePortraits(
    look.background.picture || look.student === null ? [] : [look.student]
  );
  if (look.background.picture) {
    return (
      <Styled.CardScene $variant={variant}>
        <WorkerPicture
          key={look.background.picture}
          picture={look.background.picture}
        />
      </Styled.CardScene>
    );
  }
  const art = look.student === null ? undefined : portraits.get(look.student);
  return art ? <CardArt key={art} url={art} variant={variant} /> : null;
}

/**
 * A portrait behind a card, from its copy on R2 if the Worker fails; gone
 * if both do. Decorative: the name is on the card.
 */
function CardArt({
  url,
  variant,
}: {
  url: string;
  variant: Styled.CardVariant;
}) {
  const [src, setSrc] = React.useState(url);
  const [failed, setFailed] = React.useState(false);
  if (failed) return null;
  return (
    <Styled.CardArt
      $variant={variant}
      src={src}
      alt=""
      loading="lazy"
      onError={() => {
        const backup = backupUrlFor(url);
        if (backup && src !== backup) setSrc(backup);
        else setFailed(true);
      }}
    />
  );
}

/** The favourite student's portrait in a circle, or the name's letter. */
export function Face({
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
