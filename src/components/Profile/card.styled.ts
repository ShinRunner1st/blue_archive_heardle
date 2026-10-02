import styled, { createGlobalStyle, css, keyframes } from "styled-components";
import "@fontsource-variable/nunito-sans";

import type {
  DriftShape,
  DriftWay,
  Frame as FrameParts,
  NameEffect,
} from "../../constants/cosmetics";

/**
 * The player's card, its frame and its banner: shared by the profile,
 * Customize and the rooms, so kept apart from the profile's own styles
 * (the rooms' chunk loads only these).
 */

const shadowText = css`
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.55);
`;

/* ---------- The frame: drawn from its parts ---------- */

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
  tl: "left: -7px; top: -7px;",
  tr: "right: -7px; top: -7px;",
  br: "right: -7px; bottom: -7px;",
  bl: "left: -7px; bottom: -7px;",
};

/** How far the shared ornament turns, drawn for the top left, to a corner. */
export const CORNER_TURN = { tl: 0, tr: 90, br: 180, bl: 270 };

export const Ornament = styled.svg<{
  $corner: keyof typeof CORNER_PLACE;
  /** The shared ornament, turned to its corner; a corner's own isn't. */
  $turned: boolean;
  /**
   * A picture may be sized past the small box, to show at all; shapes
   * stay cut to it, as every frame was drawn for that.
   */
  $spill: boolean;
}>`
  position: absolute;
  z-index: 2;
  width: 26px;
  height: 26px;
  overflow: ${({ $spill }) => ($spill ? "visible" : "hidden")};
  pointer-events: none;
  ${({ $corner }) => CORNER_PLACE[$corner]}
  transform: rotate(${({ $corner, $turned }) =>
    $turned ? CORNER_TURN[$corner] : 0}deg);
`;

/** A colour at a strength, as #rrggbbaa. */
const alpha = (color: string, amount: number) =>
  `${color}${Math.round(amount * 255)
    .toString(16)
    .padStart(2, "0")}`;

/**
 * A turning gradient turns this angle, which the browser only moves
 * smoothly once it knows it's an angle: registered where a frame turns
 * (ProfileFrame).
 */
export const FrameTurnProperty = createGlobalStyle`
  @property --frame-turn {
    syntax: "<angle>";
    inherits: false;
    initial-value: 0deg;
  }
`;

const turn = keyframes`
  to {
    --frame-turn: 360deg;
  }
`;

/** A frame's shadows: its inner line, then its glows at a strength. */
function frameShadows(frame: FrameParts, ground: string, glowAt = 1) {
  const { colors, inner, glows = [] } = frame;
  return [
    ...(inner
      ? [
          `inset 0 0 0 ${inner.gap}px ${ground}`,
          `inset 0 0 0 ${inner.gap + inner.width}px ${alpha(
            colors[inner.color],
            inner.strength
          )}`,
        ]
      : []),
    ...glows.map(
      ({ blur, spread, color, strength }) =>
        `0 0 ${blur * (0.5 + glowAt / 2)}px ${spread}px ${alpha(
          colors[color],
          strength * glowAt
        )}`
    ),
  ];
}

/** A frame's border, inner line and glows, as CSS, turning and breathing. */
function frameLook(frame: FrameParts, ground: string) {
  const { colors, border, pulse } = frame;
  const paint = border.colors.map((at) => colors[at]);
  const shadows = frameShadows(frame, ground);
  const spin = border.spin && paint.length > 1 ? border.spin : 0;
  // A gradient is the border-box's background, under the padding-box's.
  const gradient =
    border.gradient === "conic"
      ? `conic-gradient(from ${
          spin
            ? `calc(${border.angle ?? 0}deg + var(--frame-turn))`
            : `${border.angle ?? 0}deg`
        }, ${paint.join(", ")})`
      : border.gradient === "linear" || paint.length > 1
      ? `linear-gradient(${
          spin
            ? `calc(${border.angle ?? 90}deg + var(--frame-turn))`
            : `${border.angle ?? 90}deg`
        }, ${paint.join(", ")})`
      : null;
  const breath =
    pulse &&
    keyframes`
      from {
        box-shadow: ${shadows.join(", ")};
      }
      to {
        box-shadow: ${frameShadows(frame, ground, pulse.low).join(", ")};
      }
    `;
  const animation =
    spin && breath
      ? css`
          animation: ${turn} ${spin}s linear infinite,
            ${breath} ${pulse.seconds / 2}s ease-in-out infinite alternate;
        `
      : spin
      ? css`
          animation: ${turn} ${spin}s linear infinite;
        `
      : breath
      ? css`
          animation: ${breath} ${pulse.seconds / 2}s ease-in-out infinite
            alternate;
        `
      : null;
  return css`
    ${animation}
    ${gradient
      ? css`
          border: ${border.width}px solid transparent;
          background: linear-gradient(${ground}, ${ground}) padding-box,
            ${gradient} border-box;
        `
      : css`
          border: ${border.width}px solid ${paint[0]};
        `}
    ${shadows.length > 0 &&
    css`
      box-shadow: ${shadows.join(", ")};
    `}
  `;
}

export const FrameInner = styled.div<{
  $frame: FrameParts;
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

  ${({ $frame, theme }) => frameLook($frame, theme.background1)}
`;

/* ---------- The banner: a nameplate, as the game's emblems are ---------- */

/** A plate's size: the game's 558×106, about 5.25 wide to 1 high. */
const PLATE = {
  /* On a podium's narrow card. */
  tiny: { width: 150, height: 29, font: "0.68rem" },
  /* On a card: the lobby's, Customize's and the profile's. */
  card: { width: 184, height: 35, font: "0.72rem" },
  small: { width: 220, height: 42, font: "0.8rem" },
  large: { width: 252, height: 48, font: "0.9rem" },
};

/** A nameplate's sizes, the game's shape at each. */
export type PlateSize = keyof typeof PLATE;

/** Whether a colour is dark enough for light words over it. */
export const isDark = (color: string) => {
  const [r, g, b] = [1, 3, 5].map((at) =>
    parseInt(color.slice(at, at + 2), 16)
  );
  return 0.299 * r + 0.587 * g + 0.114 * b < 150;
};

export const Banner = styled.div<{
  $size: PlateSize;
  $fill?: string[];
  $accent: string;
  /** Seconds for its picture to pan across and back. */
  $pan?: number;
}>`
  position: relative;
  overflow: hidden;
  isolation: isolate;

  ${({ $pan }) =>
    $pan &&
    css`
      & > img {
        animation: ${pan} ${$pan / 2}s ease-in-out infinite alternate;
      }
    `}

  display: flex;
  align-items: center;
  flex-shrink: 0;

  box-sizing: border-box;
  width: ${({ $size }) => PLATE[$size].width}px;
  max-width: 100%;
  height: ${({ $size }) => PLATE[$size].height}px;

  font-family: "Nunito Sans Variable";
  font-size: ${({ $size }) => PLATE[$size].font};

  background: ${({ $fill }) =>
    $fill ? `linear-gradient(100deg, ${$fill.join(", ")})` : "#22305a"};
  border-radius: 6px;
  /* A dark edge round the plate, as the game's sit on any ground. */
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.35), 0 2px 5px rgba(0, 0, 0, 0.25);

  /* The light rim inside its edge. */
  &::after {
    content: "";
    position: absolute;
    inset: 0;
    border: 2px solid ${({ $accent }) => alpha($accent, 0.9)};
    border-radius: inherit;
    pointer-events: none;
    z-index: 4;
  }
`;

/** A title with no banner: its words alone, where the banner would be. */
export const PlainTitle = styled.span<{ $size: PlateSize }>`
  display: block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  font-family: "Nunito Sans Variable";
  font-size: ${({ $size }) => PLATE[$size].font};
  font-weight: 800;
  letter-spacing: 0.02em;
  opacity: 0.85;
`;

/** The blank banner in Customize: where a plate would be, dashed. */
export const BlankBanner = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  width: ${PLATE.small.width}px;
  max-width: 100%;
  height: ${PLATE.small.height}px;

  font-family: "Nunito Sans Variable";
  font-size: 0.8rem;
  font-weight: 800;
  opacity: 0.75;

  border: 1.5px dashed currentColor;
  border-radius: 6px;
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

/** The facets over a plate, stretched to it. */
export const BannerFacets = styled.svg`
  position: absolute;
  inset: 0;
  z-index: -1;
  width: 100%;
  height: 100%;
  pointer-events: none;
`;

/** Fine lines across a plate, or a grid of them. */
export const BannerLines = styled.span<{ $grid: boolean; $accent: string }>`
  position: absolute;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  background: ${({ $grid, $accent }) => {
    const line = alpha($accent, 0.3);
    const across = `repeating-linear-gradient(0deg, ${line} 0 1px, transparent 1px 7px)`;
    return $grid
      ? `${across}, repeating-linear-gradient(90deg, ${line} 0 1px, transparent 1px 7px)`
      : across;
  }};
  /* Fading towards the head, where the emblem sits. */
  mask-image: linear-gradient(90deg, rgba(0, 0, 0, 0.35), #000 40%);
`;

/**
 * A side emblem: a picture down the plate's left, as drawn (the game's
 * faces come cut out), or cut on a slant with a line of the accent along
 * the cut, for a photo.
 */
export const SideEmblem = styled.span<{ $accent: string; $cut: boolean }>`
  position: absolute;
  top: 0;
  bottom: 0;
  left: ${({ $cut }) => ($cut ? "0" : "1.5%")};
  z-index: 1;
  /* As drawn, a picture keeps its shape: a face, or a boss as wide as the
     game's (342×91 on a 558 plate), up to most of the plate. */
  width: ${({ $cut }) => ($cut ? "38%" : "64%")};

  & > img {
    position: absolute;
    left: 0;
    bottom: 0;
    width: auto;
    max-width: 100%;
    height: 100%;
    object-fit: contain;
    object-position: left bottom;
  }

  ${({ $cut, $accent }) =>
    $cut &&
    css`
      background: ${$accent};
      clip-path: polygon(0 0, 100% 0, calc(100% - 14%) 100%, 0 100%);

      & > img {
        inset: 0 3px 0 0;
        width: calc(100% - 3px);
        object-fit: cover;
        object-position: center 20%;
        clip-path: polygon(0 0, 100% 0, calc(100% - 14%) 100%, 0 100%);
      }
    `}
`;

/** An emblem: in a ring at the plate's head, or standing free as a crest. */
export const Emblem = styled.span<{
  $style: "ring" | "crest";
  $accent: string;
  $ink: string;
}>`
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-sizing: border-box;
  aspect-ratio: 1;
  color: ${({ $ink }) => $ink};

  ${({ $style, $accent }) =>
    $style === "ring"
      ? css`
          height: calc(100% - 10px);
          margin-left: 6px;
          padding: 3px;
          font-size: 0.95em;
          background: rgba(0, 0, 0, 0.28);
          border: 2px solid ${$accent};
          border-radius: 50%;
        `
      : css`
          height: calc(100% - 6px);
          margin-left: 6px;
          font-size: 1.25em;
          filter: drop-shadow(0 1px 1.5px rgba(0, 0, 0, 0.35));
        `}

  & > svg {
    width: 100%;
    height: 100%;
  }
`;

/** Where the title sits: the plate's middle, past a side emblem. */
export const BannerText = styled.span<{
  /** A side emblem, which the title clears: cut, or as drawn (wider). */
  $side: "cut" | "drawn" | null;
  $tag: boolean;
}>`
  position: relative;
  z-index: 2;
  flex: 1;
  min-width: 0;
  align-self: stretch;
  display: flex;
  align-items: center;
  justify-content: center;
  /* Over a tag, the title sits a little above the middle. */
  padding: ${({ $tag }) => ($tag ? "0 10px 0.6em 8px" : "0 10px 0 8px")};
  margin-left: ${({ $side }) =>
    $side === "cut" ? "30%" : $side === "drawn" ? "36%" : "0"};
`;

/** A soft band behind the title, fading at both ends. */
export const BannerBand = styled.span<{ $band: string; $tag: boolean }>`
  position: absolute;
  left: 0;
  right: 0;
  top: ${({ $tag }) => ($tag ? "14%" : "22%")};
  bottom: ${({ $tag }) => ($tag ? "calc(14% + 0.6em)" : "22%")};
  z-index: -1;
  background: ${({ $band }) =>
    `linear-gradient(90deg, transparent, ${alpha($band, 0.78)} 18%, ${alpha(
      $band,
      0.78
    )} 82%, transparent)`};
`;

export const BannerTitle = styled.span<{ $ink: string }>`
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  font-weight: 900;
  letter-spacing: 0.02em;
  color: ${({ $ink }) => $ink};
  /* Dark words get a light glow, light ones a shadow, to read over a picture. */
  text-shadow: ${({ $ink }) =>
    isDark($ink)
      ? "0 0 3px rgba(255, 255, 255, 0.85)"
      : "0 1px 2px rgba(0, 0, 0, 0.45)"};
`;

/** A tag at the plate's foot, in a pill of the title's colour. */
export const BannerTag = styled.span<{ $ink: string }>`
  position: absolute;
  right: 10px;
  bottom: 9%;
  z-index: 3;
  padding: 0 0.7em;

  font-size: 0.56em;
  font-weight: 900;
  line-height: 1.6;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  white-space: nowrap;

  color: ${({ $ink }) => (isDark($ink) ? "#FFFFFF" : "#1B2A4A")};
  background: ${({ $ink }) => alpha($ink, 0.88)};
  border-radius: 999px;
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

/** The ring round a face, in px: the picture sits inside it, whole. */
const faceRing = (size: number) => (size >= 48 ? 3 : 2);

export const Face = styled.div<{ $size: number }>`
  position: relative;
  flex-shrink: 0;
  box-sizing: border-box;
  /* The picture's size and its ring each side, so it sits in the middle. */
  width: ${({ $size }) => $size + faceRing($size) * 2}px;
  height: ${({ $size }) => $size + faceRing($size) * 2}px;
  padding: ${({ $size }) => faceRing($size)}px;
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

/**
 * Over the whole card, under its corner (the host's Kick stays pressable):
 * opens the player's profile (docs/room-profiles.md).
 */
export const CardOpen = styled.button`
  position: absolute;
  inset: 0;
  z-index: 1;

  padding: 0;
  background: transparent;
  border: 0;
  border-radius: inherit;
  cursor: pointer;

  &:hover {
    background-color: rgba(255, 255, 255, 0.06);
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.border};
    outline-offset: -2px;
  }
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

/* ---------- Moving parts: things drifting, a shine, a name's ink ---------- */

/** Over its cosmetic, letting presses through, cut to its rounded box. */
export const DriftBox = styled.span<{ $edge?: boolean }>`
  position: absolute;
  inset: ${({ $edge }) => ($edge ? "-3px" : "0")};
  z-index: ${({ $edge }) => ($edge ? 3 : 0)};
  overflow: hidden;
  border-radius: inherit;
  pointer-events: none;
`;

const fall = keyframes`
  from {
    transform: translateY(0);
  }
  to {
    transform: translateY(calc(100% + var(--size) * 2));
  }
`;

const rise = keyframes`
  from {
    transform: translateY(calc(100% + var(--size) * 2));
  }
  to {
    transform: translateY(0);
  }
`;

const sway = keyframes`
  0%,
  100% {
    transform: translateX(calc(var(--sway) * -1)) rotate(0deg);
  }
  50% {
    transform: translateX(var(--sway)) rotate(calc(var(--turn) / 2));
  }
`;

const twinkle = keyframes`
  0%,
  100% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.3) rotate(0deg);
  }
  50% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1) rotate(45deg);
  }
`;

/**
 * A falling or rising thing's lane, as tall as the box, so moving it by
 * its own height carries the thing from one end to the other.
 */
export const DriftLane = styled.span<{ $way: DriftWay }>`
  position: absolute;
  top: 0;
  width: 0;
  height: 100%;
  animation: ${({ $way }) => ($way === "rise" ? rise : fall)} var(--seconds)
    linear var(--delay) infinite;
`;

const SHAPES: Record<DriftShape, ReturnType<typeof css>> = {
  petal: css`
    height: calc(var(--size) * 0.7);
    border-radius: 100% 0 100% 0;
    opacity: 0.9;
  `,
  leaf: css`
    height: calc(var(--size) * 0.55);
    border-radius: 0 100% 0 100%;
    opacity: 0.95;
  `,
  snow: css`
    border-radius: 50%;
    box-shadow: 0 0 calc(var(--size) / 2) var(--color);
    opacity: 0.9;
  `,
  spark: css`
    border-radius: 50%;
    box-shadow: 0 0 var(--size) var(--color),
      0 0 calc(var(--size) * 2) var(--color);
  `,
  star: css`
    clip-path: polygon(
      50% 0,
      61% 39%,
      100% 50%,
      61% 61%,
      50% 100%,
      39% 61%,
      0 50%,
      39% 39%
    );
  `,
  bubble: css`
    border-radius: 50%;
    background: radial-gradient(
      circle at 32% 30%,
      rgba(255, 255, 255, 0.85) 0 14%,
      transparent 32%
    );
    box-shadow: inset 0 0 0 1px var(--color);
    opacity: 0.75;
  `,
};

/** One thing drifting: its shape in its colour, at its size. */
export const Mote = styled.span<{ $shape: DriftShape; $way: DriftWay }>`
  position: absolute;
  width: var(--size);
  height: var(--size);
  background: var(--color);

  ${({ $way }) =>
    $way === "twinkle"
      ? css`
          left: var(--x);
          top: var(--y);
          opacity: 0;
          animation: ${twinkle} var(--seconds) ease-in-out var(--delay) infinite;
        `
      : css`
          left: calc(var(--size) / -2);
          top: calc(var(--size) * -1);
          animation: ${sway} calc(var(--seconds) / 2) ease-in-out var(--delay)
            infinite;
        `}

  ${({ $shape }) => SHAPES[$shape]}
`;

const sweep = keyframes`
  0% {
    transform: translateX(-120%) skewX(-20deg);
  }
  35%,
  100% {
    transform: translateX(320%) skewX(-20deg);
  }
`;

/** A light across a plate now and then, as over foil. */
export const BannerShine = styled.span<{ $color: string; $seconds: number }>`
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  z-index: 3;
  width: 32%;
  pointer-events: none;
  background: linear-gradient(
    90deg,
    transparent,
    ${({ $color }) => alpha($color, 0.55)} 50%,
    transparent
  );
  animation: ${sweep} ${({ $seconds }) => $seconds}s ease-in-out infinite;
`;

/** A plate's picture panning slowly across and back. */
export const pan = keyframes`
  from {
    transform: scale(1.18) translateX(-6%);
  }
  to {
    transform: scale(1.18) translateX(6%);
  }
`;

/* What keeps a name readable on any card, under its glow. */
const nameShadow = "drop-shadow(0 1px 1.5px rgba(0, 0, 0, 0.5))";

const glowOf = (effect: NameEffect, strength = 1, blurAt = 1) =>
  effect.glow
    ? ` drop-shadow(0 0 ${effect.glow.blur * blurAt}px ${alpha(
        effect.colors[effect.glow.color],
        effect.glow.strength * strength
      )})`
    : "";

/** The letters' colours, as background layers to clip to them. */
function nameInk(effect: NameEffect): { image: string; size: string } {
  const fill = effect.fill?.map((at) => effect.colors[at]);
  const angle = effect.angle ?? 90;
  // A flow runs two rounds of its colours across twice the name, so
  // moving it by the name's width brings the first round back.
  const ground = !fill
    ? {
        image: "linear-gradient(currentColor, currentColor)",
        size: "100% 100%",
      }
    : effect.motion?.kind === "flow" && fill.length > 1
    ? {
        image: `linear-gradient(90deg, ${[...fill, ...fill, fill[0]].join(
          ", "
        )})`,
        size: "200% 100%",
      }
    : fill.length === 1
    ? { image: `linear-gradient(${fill[0]}, ${fill[0]})`, size: "100% 100%" }
    : {
        image: `linear-gradient(${angle}deg, ${fill.join(", ")})`,
        size: "100% 100%",
      };
  if (effect.motion?.kind !== "shine") return ground;
  const light =
    effect.motion.color === undefined
      ? "#FFFFFF"
      : effect.colors[effect.motion.color];
  return {
    image: `linear-gradient(105deg, transparent 42%, ${alpha(
      light,
      0.95
    )} 50%, transparent 58%), ${ground.image}`,
    size: `250% 100%, ${ground.size}`,
  };
}

/** How each motion moves the letters. */
function nameMotion(effect: NameEffect) {
  const { motion } = effect;
  if (!motion) return null;
  const lit = `${nameShadow}${glowOf(effect)}`;
  switch (motion.kind) {
    case "flow":
      return css`
        animation: ${keyframes`
          from { background-position: 0% 0; }
          to { background-position: 100% 0; }
        `} ${motion.seconds}s linear infinite;
      `;
    case "shine":
      return css`
        animation: ${keyframes`
          0% { background-position: 150% 0, 0 0; }
          40%, 100% { background-position: -50% 0, 0 0; }
        `} ${motion.seconds}s ease-in-out infinite;
      `;
    case "pulse":
      return css`
        animation: ${keyframes`
          from { filter: ${lit}; }
          to { filter: ${nameShadow}${glowOf(effect, 0.25, 0.4)}; }
        `} ${motion.seconds / 2}s ease-in-out infinite alternate;
      `;
    case "flicker":
      return css`
        animation: ${keyframes`
          0%, 18%, 22%, 25%, 53%, 57%, 100% { filter: ${lit}; opacity: 1; }
          20%, 24%, 55% { filter: ${nameShadow}; opacity: 0.6; }
        `} ${motion.seconds}s linear infinite;
      `;
  }
}

/** A name in its effect's colours, glowing and moving as it says. */
export const NameInk = styled.span<{ $effect: NameEffect }>`
  /* Inline, so a long name ends in the card's own "…". */
  display: inline;
  -webkit-box-decoration-break: clone;
  box-decoration-break: clone;

  ${({ $effect }) => {
    const ink = nameInk($effect);
    return css`
      color: transparent;
      background-image: ${ink.image};
      background-size: ${ink.size};
      background-repeat: no-repeat;
      -webkit-background-clip: text;
      background-clip: text;
      text-shadow: none;
      filter: ${nameShadow}${glowOf($effect)};
    `;
  }}

  ${({ $effect }) => nameMotion($effect)}
`;
