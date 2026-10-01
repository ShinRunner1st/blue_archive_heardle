import styled, { css } from "styled-components";
import "@fontsource-variable/nunito-sans";

import { FrameKind } from "../../constants/cosmetics";

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

export const Card = styled.div<{ $size: "small" | "large" }>`
  position: relative;
  isolation: isolate;

  display: flex;
  align-items: center;
  gap: ${({ $size }) => ($size === "large" ? "20px" : "14px")};

  box-sizing: border-box;
  min-height: ${({ $size }) => ($size === "large" ? "150px" : "104px")};
  padding: ${({ $size }) => ($size === "large" ? "18px 22px" : "12px 16px")};

  font-family: "Nunito Sans Variable";
  color: ${({ theme }) => theme.text};
  background-color: ${({ theme }) => theme.background1};
`;

/** The background scene, fading in from the card's left. */
export const CardScene = styled.div`
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: 70%;
  z-index: -1;
  mask-image: linear-gradient(90deg, transparent, #000 55%);

  img {
    z-index: 0;
    opacity: 0.85;
  }
`;

export const Face = styled.div<{ $size: number }>`
  flex-shrink: 0;
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;
  padding: 3px;
  background-color: ${({ theme }) => theme.background1};
  border-radius: 50%;
`;

export const Letter = styled.span<{ $size: number }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;

  font-size: ${({ $size }) => Math.round($size * 0.42)}px;
  font-weight: 900;
  color: #ffffff;

  background-color: #3b6fd9;
  border-radius: 50%;
`;

export const CardText = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  min-width: 0;
`;

export const CardName = styled.span<{ $size: "small" | "large" }>`
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  font-size: ${({ $size }) => ($size === "large" ? "1.7rem" : "1.15rem")};
  font-weight: 900;
  line-height: 1.1;
  ${shadowText}
`;

export const Meta = styled.span`
  font-size: 0.8rem;
  font-weight: 700;
  opacity: 0.85;
  ${shadowText}
`;

/* ---------- The profile ---------- */

export const Tabs = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 18px 0 12px;
`;

export const Tab = styled.button<{ $active: boolean }>`
  padding: 6px 14px;

  font-family: "Nunito Sans Variable";
  font-size: 0.85rem;
  font-weight: 800;
  color: ${({ theme }) => theme.text};

  background-color: ${({ theme, $active }) =>
    $active ? theme.blue : "rgba(255, 255, 255, 0.08)"};
  border: none;
  border-radius: 999px;
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.border};
    outline-offset: 2px;
  }
`;

export const Tiles = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 8px;
`;

export const Tile = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding: 10px 12px;

  background-color: rgba(255, 255, 255, 0.06);
  border-radius: 10px;
`;

export const TileLabel = styled.span`
  font-size: 0.75rem;
  font-weight: 700;
  opacity: 0.7;
`;

export const TileValue = styled.span`
  font-size: 1.4rem;
  font-weight: 900;
  line-height: 1.15;
  font-variant-numeric: tabular-nums;
`;

export const TileSub = styled.span`
  font-size: 0.72rem;
  font-weight: 700;
  opacity: 0.65;
`;

export const Note = styled.p`
  grid-column: 1 / -1;
  margin: 8px 2px 0;
  font-size: 0.75rem;
  opacity: 0.65;
`;

export const Heading = styled.h3`
  margin: 18px 0 8px;
  font-size: 1rem;
  font-weight: 900;
`;

export const SubHeading = styled.h4`
  margin: 14px 0 6px;
  font-size: 0.88rem;
  font-weight: 900;
`;

export const TableWrap = styled.div`
  overflow-x: auto;
`;

export const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
  font-variant-numeric: tabular-nums;

  th,
  td {
    padding: 7px 8px;
    text-align: right;
    white-space: nowrap;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }

  thead th {
    font-size: 0.72rem;
    font-weight: 800;
    opacity: 0.7;
  }

  th:first-child {
    text-align: left;
    font-weight: 900;
  }

  thead th:first-child {
    font-weight: 800;
  }
`;

export const Game = styled.section`
  & + & {
    margin-top: 10px;
    padding-top: 4px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
  }
`;

export const GameColumns = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 0 24px;

  @media (min-width: 760px) {
    grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr);
  }
`;

export const Spread = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

export const SpreadRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

export const SpreadLabel = styled.span`
  width: 40px;
  white-space: nowrap;
  flex-shrink: 0;
  font-size: 0.75rem;
  font-weight: 800;
  opacity: 0.75;
  text-align: right;
`;

export const SpreadBar = styled.span<{ $lost: boolean }>`
  box-sizing: border-box;
  min-width: 24px;
  padding: 1px 6px;

  font-size: 0.72rem;
  font-weight: 900;
  text-align: right;
  color: #ffffff;

  background-color: ${({ theme, $lost }) => ($lost ? theme.red : theme.blue)};
  border-radius: 4px;
`;

/* ---------- Customize ---------- */

export const Preview = styled.div`
  max-width: 420px;
  margin: 4px auto 6px;
`;

export const Section = styled.section`
  margin-top: 6px;
`;

export const SectionHead = styled.div`
  display: flex;
  align-items: baseline;
  gap: 10px;
`;

export const SectionCount = styled.span`
  font-size: 0.75rem;
  opacity: 0.65;
`;

/** How wide each kind's choices are: a banner needs its title's room. */
const OPTION_WIDTH: Record<string, string> = {
  title: "140px",
  banner: "236px",
  frame: "130px",
};

export const Options = styled.div<{ $kind: string }>`
  display: grid;
  grid-template-columns: repeat(
    auto-fill,
    minmax(min(${({ $kind }) => OPTION_WIDTH[$kind] ?? "170px"}, 100%), 1fr)
  );
  gap: 12px;
`;

export const Option = styled.button<{ $active: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 6px;

  font-family: "Nunito Sans Variable";
  text-align: left;
  color: ${({ theme }) => theme.text};

  background: ${({ $active }) =>
    $active ? "rgba(18, 138, 250, 0.18)" : "transparent"};
  border: 2px solid
    ${({ theme, $active }) => ($active ? theme.blue : "transparent")};
  border-radius: 12px;
  cursor: pointer;

  &[aria-disabled="true"] {
    cursor: default;
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.border};
    outline-offset: 2px;
  }
`;

/** A locked title shows dimmed, its mission named under it. */
export const OptionLook = styled.div<{ $locked?: boolean }>`
  position: relative;
  opacity: ${({ $locked }) => ($locked ? 0.45 : 1)};
`;

export const OptionName = styled.span`
  font-size: 0.78rem;
  font-weight: 800;
`;

/** Over a locked choice: the lock and the mission that opens it. */
export const Lock = styled.span`
  position: absolute;
  inset: -2px;
  z-index: 3;

  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 4px 8px;

  font-size: 0.72rem;
  font-weight: 800;
  line-height: 1.2;
  text-align: center;
  color: #ffffff;

  background-color: rgba(14, 12, 30, 0.74);
  border-radius: 8px;
`;

export const FrameSwatch = styled.div`
  padding: 6px;
`;

export const FrameFill = styled.div`
  height: 56px;
`;

export const SceneSwatch = styled.div`
  position: relative;
  isolation: isolate;
  overflow: hidden;
  height: 72px;

  background-color: rgba(255, 255, 255, 0.06);
  border-radius: 10px;

  img {
    z-index: 0;
  }
`;

/** The pop-up's whole width: its body centres what's narrower. */
export const Body = styled.div`
  box-sizing: border-box;
  width: 100%;
  padding: 0 28px;

  @media (max-width: 480px) {
    padding: 0 18px;
  }
`;

/** A title as a choice: its words alone. */
export const TitleChip = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  min-height: 38px;
  padding: 6px 12px;

  font-size: 0.85rem;
  font-weight: 800;
  text-align: center;

  background-color: rgba(255, 255, 255, 0.07);
  border-radius: 999px;
`;

/* ---------- The profile's head ---------- */

export const Hero = styled.div`
  position: relative;
  isolation: isolate;
  box-sizing: border-box;
  width: 100%;
  font-family: "Nunito Sans Variable";
`;

/** The background scene across the top, fading into the panel. */
export const HeroScene = styled.div`
  position: relative;
  isolation: isolate;
  height: 170px;
  overflow: hidden;

  background: linear-gradient(
    135deg,
    ${({ theme }) => theme.background1},
    ${({ theme }) => theme.background100}
  );

  &::after {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(
      rgba(0, 0, 0, 0) 30%,
      ${({ theme }) => theme.background100}
    );
  }

  img {
    z-index: -1;
  }

  @media (max-width: 480px) {
    height: 130px;
  }
`;

/** Customize and the Sensei card, over the scene by the close button. */
export const HeroActions = styled.div`
  position: absolute;
  top: 12px;
  right: 56px;
  z-index: 2;
  display: flex;
  gap: 8px;
`;

export const HeroAction = styled.button`
  height: 32px;
  padding: 0 14px;

  font-family: "Nunito Sans Variable";
  font-size: 0.82rem;
  font-weight: 800;
  color: #ffffff;

  background: rgba(14, 12, 30, 0.7);
  border: none;
  border-radius: 999px;
  cursor: pointer;

  &:hover {
    background: rgba(14, 12, 30, 0.88);
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.border};
    outline-offset: 2px;
  }
`;

/** The picture over the scene's foot, and the name, banner and line. */
export const HeroBody = styled.div`
  position: relative;
  z-index: 1;

  display: flex;
  align-items: flex-end;
  gap: 18px;

  margin-top: -66px;
  padding: 0 28px;

  @media (max-width: 480px) {
    margin-top: -52px;
    padding: 0 18px;
    gap: 12px;
  }
`;

export const HeroFace = styled.div`
  flex-shrink: 0;
  padding: 4px;
  background-color: ${({ theme }) => theme.background100};
  border-radius: 50%;
`;

export const HeroText = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  min-width: 0;
  padding-bottom: 6px;
`;

export const HeroName = styled.h2`
  margin: 0;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  font-size: 1.9rem;
  font-weight: 900;
  line-height: 1.05;
  ${shadowText}

  @media (max-width: 480px) {
    font-size: 1.4rem;
  }
`;
