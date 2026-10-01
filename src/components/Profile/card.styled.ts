import styled, { css } from "styled-components";
import "@fontsource-variable/nunito-sans";

import { FrameKind } from "../../constants/cosmetics";

/**
 * The player's card, its frame and its banner: shared by the profile,
 * Customize and the rooms, so kept apart from the profile's own styles
 * (the rooms' chunk loads only these).
 */

const shadowText = css`
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.55);
`;

/* ---------- The frame: a border drawn for its kind ---------- */

export const Frame = styled.div<{ $popUp?: boolean }>`
  position: relative;

  ${({ $popUp }) =>
    $popUp &&
    css`
      width: 100%;
      max-width: 960px;

      @media (max-width: 480px) {
        max-width: none;
      }
    `}
`;

const CORNER_PLACE = {
  tl: "left: -7px; top: -7px; transform: rotate(0deg);",
  tr: "right: -7px; top: -7px; transform: rotate(90deg);",
  br: "right: -7px; bottom: -7px; transform: rotate(180deg);",
  bl: "left: -7px; bottom: -7px; transform: rotate(270deg);",
};

export const Ornament = styled.svg<{ $corner: keyof typeof CORNER_PLACE }>`
  position: absolute;
  z-index: 2;
  width: 26px;
  height: 26px;
  pointer-events: none;
  ${({ $corner }) => CORNER_PLACE[$corner]}
`;

/** A colour at a strength, as #rrggbbaa. */
const alpha = (color: string, amount: number) =>
  `${color}${Math.round(amount * 255)
    .toString(16)
    .padStart(2, "0")}`;

export const FrameInner = styled.div<{
  $kind: FrameKind;
  $colors: string[];
  $popUp?: boolean;
}>`
  position: relative;
  overflow: hidden;
  border-radius: 16px;
  box-sizing: border-box;

  ${({ $popUp }) =>
    $popUp &&
    css`
      display: flex;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.45);

      & > * {
        flex: 1 1 auto;
      }

      @media (max-width: 480px) {
        border-bottom: none !important;
        border-radius: 18px 18px 0 0;
      }
    `}

  ${({ $kind, $colors, theme }) => {
    const [line, accent = line] = $colors;
    const ground = theme.background1;
    switch ($kind) {
      case "filigree":
        return css`
          border: 2px solid ${line};
          box-shadow: inset 0 0 0 4px ${ground},
            inset 0 0 0 5px ${alpha(accent, 0.6)};
        `;
      case "petals":
        return css`
          border: 2px solid ${line};
          box-shadow: 0 0 0 1px ${alpha(line, 0.3)};
        `;
      case "halo":
        return css`
          border: 2px solid ${line};
          box-shadow: 0 0 12px ${alpha(line, 0.4)};
        `;
      case "neon":
        return css`
          border: 2px solid transparent;
          background: linear-gradient(${ground}, ${ground}) padding-box,
            linear-gradient(120deg, ${$colors.join(", ")}) border-box;
          box-shadow: 0 0 14px ${alpha($colors[1] ?? line, 0.55)},
            0 0 4px ${alpha(line, 0.6)};
        `;
      case "prism":
        return css`
          border: 3px solid transparent;
          background: linear-gradient(${ground}, ${ground}) padding-box,
            conic-gradient(from 30deg, ${[...$colors, $colors[0]].join(", ")})
              border-box;
        `;
      default:
        return css`
          border: 1px solid ${line};
        `;
    }
  }}
`;

/* ---------- The banner ---------- */

export const Banner = styled.div<{
  $size: "small" | "large";
  $fill?: string[];
  $accent: string;
}>`
  position: relative;
  overflow: hidden;
  isolation: isolate;

  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;

  box-sizing: border-box;
  width: ${({ $size }) => ($size === "large" ? "280px" : "220px")};
  max-width: 100%;
  height: ${({ $size }) => ($size === "large" ? "38px" : "30px")};
  padding: 0 18px 0 4px;

  font-family: "Nunito Sans Variable";
  font-size: ${({ $size }) => ($size === "large" ? "0.95rem" : "0.8rem")};

  background: ${({ $fill }) =>
    $fill ? `linear-gradient(100deg, ${$fill.join(", ")})` : "#22305a"};
  border-radius: 4px;
  /* Cut on a slant at its tail, as the game's name plates are. */
  clip-path: polygon(0 0, 100% 0, calc(100% - 12px) 100%, 0 100%);

  /* A thin line of the accent along its foot. */
  &::after {
    content: "";
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 2px;
    background: ${({ $accent }) => $accent};
    opacity: 0.85;
    z-index: 2;
  }
`;

/** A picture filling its box, as a banner's or a card's scene. */
export const Cover = styled.img`
  position: absolute;
  inset: 0;
  z-index: -2;
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

export const BannerTint = styled.span<{ $tint: string }>`
  position: absolute;
  inset: 0;
  z-index: -1;
  background: ${({ $tint }) =>
    `linear-gradient(90deg, ${$tint} 0%, ${alpha($tint, 0.85)} 50%, ${alpha(
      $tint,
      0.1
    )} 100%)`};
`;

/** Slanted stripes at the banner's tail. */
export const BannerStripes = styled.span<{ $accent: string }>`
  position: absolute;
  top: 0;
  right: 10px;
  bottom: 0;
  width: 44px;
  z-index: -1;
  background: repeating-linear-gradient(
    115deg,
    ${({ $accent }) => alpha($accent, 0.55)} 0 4px,
    transparent 4px 9px
  );
  mask-image: linear-gradient(90deg, transparent, #000);
`;

/** The banner's emblem, in a ring at its head. */
export const Emblem = styled.span<{ $accent: string; $ink: string }>`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  height: calc(100% - 8px);
  aspect-ratio: 1;

  font-size: 0.85em;
  color: ${({ $ink }) => $ink};

  background: rgba(0, 0, 0, 0.28);
  border: 2px solid ${({ $accent }) => $accent};
  border-radius: 50%;
  box-sizing: border-box;
`;

export const BannerTitle = styled.span<{ $ink: string }>`
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  font-weight: 900;
  letter-spacing: 0.02em;
  color: ${({ $ink }) => $ink};
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.35);
`;

/* ---------- The card ---------- */

/**
 * The card's shapes: wide in the lobby and Customize (the banner under the
 * name), mini in a round's grid (a line and the score in its place), tall
 * on the podium, and a row in the standings' list.
 */
export type CardVariant = "wide" | "mini" | "tall" | "row";

/** Around the frame: dimmed when away, ringed for you or a round's mark. */
export const CardWrap = styled.div<{
  $away?: boolean;
  $ring?: string;
}>`
  position: relative;
  min-width: 0;
  border-radius: 16px;
  opacity: ${({ $away }) => ($away ? 0.55 : 1)};

  ${({ $ring }) =>
    $ring &&
    css`
      outline: 2px solid ${$ring};
      outline-offset: 2px;
    `}
`;

const VARIANTS: Record<CardVariant, ReturnType<typeof css>> = {
  wide: css`
    gap: 14px;
    min-height: 104px;
    padding: 12px 16px;

    @media (max-width: 600px) {
      gap: 10px;
      min-height: 80px;
      padding: 8px 10px;
    }
  `,
  mini: css`
    gap: 7px;
    height: 44px;
    padding: 0 6px 0 7px;
  `,
  tall: css`
    flex-direction: column;
    justify-content: flex-end;
    gap: 2px;
    /* A podium sets it, the winner's taller. */
    min-height: var(--card-tall, 150px);
    padding: 12px 8px 10px;
    text-align: center;
  `,
  row: css`
    gap: 10px;
    height: 40px;
    padding: 0 12px;
  `,
};

export const Card = styled.div<{ $variant: CardVariant; $banner?: boolean }>`
  position: relative;
  isolation: isolate;

  display: flex;
  align-items: center;

  box-sizing: border-box;

  font-family: "Nunito Sans Variable";
  color: ${({ theme }) => theme.text};
  background-color: ${({ theme }) => theme.background1};

  ${({ $variant }) => VARIANTS[$variant]}

  /* A tall card with its banner: taller by the banner. */
  ${({ $variant, $banner }) =>
    $variant === "tall" &&
    $banner &&
    css`
      min-height: calc(var(--card-tall, 150px) + 34px);
    `}
`;

/** The background scene, fading in from the card's left. */
export const CardScene = styled.div<{ $variant: CardVariant }>`
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: 70%;
  z-index: -1;
  mask-image: linear-gradient(90deg, transparent, #000 55%);

  img {
    z-index: 0;
    /* Fainter on the small cards, so their words read over it. */
    opacity: ${({ $variant }) =>
      $variant === "mini" || $variant === "row" ? 0.45 : 0.85};
  }

  ${({ $variant }) =>
    $variant === "tall" &&
    css`
      width: 100%;
      mask-image: linear-gradient(#000 35%, transparent 90%);
    `}
`;

/**
 * With no scene picked, the student's portrait faded in from the card's
 * middle, as the lobby has had it; on a tall card, from its top.
 */
export const CardArt = styled.img<{ $variant: CardVariant }>`
  position: absolute;
  top: 0;
  right: 0;
  z-index: -1;
  width: ${({ $variant }) =>
    $variant === "tall" ? "100%" : $variant === "wide" ? "58%" : "50%"};
  height: 100%;

  object-fit: cover;
  object-position: center 18%;
  opacity: ${({ $variant }) =>
    $variant === "wide" ? 0.7 : $variant === "mini" ? 0.35 : 0.55};
  pointer-events: none;

  mask-image: ${({ $variant }) =>
    $variant === "tall"
      ? "linear-gradient(#000 30%, transparent 88%)"
      : "linear-gradient(90deg, transparent, #000 70%)"};
`;

export const Face = styled.div<{ $size: number }>`
  position: relative;
  flex-shrink: 0;
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;
  padding: ${({ $size }) => ($size >= 48 ? 3 : 2)}px;
  background-color: ${({ theme }) => theme.background1};
  border-radius: 50%;

  & > * {
    display: flex;
  }
`;

export const Letter = styled.span<{ $size: number; $hue?: number }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;

  font-size: ${({ $size }) => Math.round($size * 0.42)}px;
  font-weight: 900;
  color: #ffffff;

  background-color: ${({ $hue }) =>
    $hue === undefined ? "#3b6fd9" : `hsl(${$hue} 45% 42%)`};
  border-radius: 50%;
`;

export const CardText = styled.div<{ $variant: CardVariant }>`
  display: flex;
  flex-direction: column;
  align-items: ${({ $variant }) =>
    $variant === "tall" ? "center" : "flex-start"};
  gap: ${({ $variant }) => ($variant === "wide" ? "8px" : "1px")};
  /* A tall card keeps its words at its foot, under the picture. */
  flex: ${({ $variant }) => ($variant === "tall" ? "0 0 auto" : "1 1 auto")};
  min-width: 0;
  max-width: 100%;

  @media (max-width: 600px) {
    gap: ${({ $variant }) => ($variant === "wide" ? "6px" : "1px")};
  }
`;

const NAME_SIZE: Record<CardVariant, string> = {
  wide: "1.15rem",
  mini: "0.8rem",
  tall: "0.95rem",
  row: "0.9rem",
};

export const CardName = styled.span<{
  $variant: CardVariant;
  $room?: boolean;
  $you?: boolean;
}>`
  box-sizing: border-box;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  font-size: ${({ $variant }) => NAME_SIZE[$variant]};
  font-weight: 900;
  line-height: 1.2;
  color: ${({ $you }) => ($you ? "#9ccbff" : "inherit")};
  ${shadowText}

  /* Clear of the chip in the card's corner. */
  padding-right: ${({ $room }) => ($room ? "64px" : "0")};

  & > small {
    font-size: 0.7em;
    font-weight: 700;
    opacity: 0.8;
  }

  @media (max-width: 600px) {
    font-size: ${({ $variant }) =>
      $variant === "wide" ? "0.95rem" : NAME_SIZE[$variant]};
    /* Too narrow to share a line with the corner's chip: under it. */
    padding-right: 0;
    margin-top: ${({ $room }) => ($room ? "14px" : "0")};
  }
`;

/** A line in the banner's place: what a player is doing, or a score. */
export const CardLine = styled.span<{ $right?: boolean | null }>`
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  font-size: 0.72rem;
  font-weight: 800;
  line-height: 1.2;
  color: ${({ $right }) =>
    $right === true ? "lightgreen" : $right === false ? "#ff8a8a" : "inherit"};
  ${shadowText}
`;

/** On the card's right: a score. */
export const CardAside = styled.div`
  flex-shrink: 0;
  margin-left: auto;
`;

/** In the card's top corner: a state chip, the host's Kick. */
export const CardCorner = styled.div`
  position: absolute;
  top: 8px;
  right: 10px;
  z-index: 2;

  display: flex;
  align-items: center;
  gap: 4px;

  @media (max-width: 600px) {
    top: 5px;
    right: 6px;
  }
`;
