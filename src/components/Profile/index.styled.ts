import styled, { css } from "styled-components";
import "@fontsource-variable/nunito-sans";

export * from "./card.styled";

const shadowText = css`
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.55);
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

/**
 * Customize: the card beside the choices on a wide screen, held in place
 * as they scroll; over them on a phone, pinned to the pop-up's top.
 */
export const CustomizeBody = styled.div`
  box-sizing: border-box;
  width: 100%;
  padding: 0 28px;

  @media (min-width: 761px) {
    display: grid;
    grid-template-columns: 340px minmax(0, 1fr);
    gap: 28px;
    align-items: start;
  }

  @media (max-width: 480px) {
    padding: 0 18px;
  }
`;

export const Preview = styled.div`
  position: sticky;
  top: 0;
  z-index: 4;

  display: flex;
  flex-direction: column;
  gap: 8px;

  @media (max-width: 760px) {
    /* Pinned over the choices: the pop-up's colour under it, so they
       scroll away behind it. */
    margin: -18px -28px 0;
    padding: 12px 28px 14px;
    background-color: ${({ theme }) => theme.background100};
    box-shadow: 0 10px 14px -10px rgba(0, 0, 0, 0.5);
  }

  @media (max-width: 480px) {
    margin: -18px -18px 0;
    padding: 10px 18px 12px;
  }
`;

export const PreviewLabel = styled.span`
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  opacity: 0.7;
`;

export const Choices = styled.div`
  min-width: 0;
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

/** A locked banner shows dimmed, its mission named under it. */
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

/** The titles, a row each. */
export const TitleList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

export const TitleRow = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 42px;
  padding: 6px 12px;

  font-family: "Nunito Sans Variable";
  text-align: left;
  color: ${({ theme }) => theme.text};

  background: ${({ $active }) =>
    $active ? "rgba(18, 138, 250, 0.18)" : "rgba(255, 255, 255, 0.05)"};
  border: 2px solid
    ${({ theme, $active }) => ($active ? theme.blue : "transparent")};
  border-radius: 10px;
  cursor: pointer;

  &[aria-disabled="true"] {
    cursor: default;
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.border};
    outline-offset: 2px;
  }
`;

/** A radio's dot, filled for the title picked. */
export const Radio = styled.span<{ $active: boolean }>`
  flex-shrink: 0;
  box-sizing: border-box;
  width: 16px;
  height: 16px;

  border: 2px solid
    ${({ theme, $active }) =>
      $active ? theme.blue : "rgba(255, 255, 255, 0.4)"};
  border-radius: 50%;
  box-shadow: ${({ theme, $active }) =>
    $active ? `inset 0 0 0 3px ${theme.background100}` : "none"};
  background-color: ${({ theme, $active }) =>
    $active ? theme.blue : "transparent"};
`;

export const TitleName = styled.span<{ $locked: boolean }>`
  flex: 1 1 auto;
  min-width: 0;
  font-size: 0.9rem;
  font-weight: 800;
  opacity: ${({ $locked }) => ($locked ? 0.45 : 1)};
`;

/** A locked title's lock and the mission that opens it. */
export const TitleLock = styled.span`
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 1;
  min-width: 0;
  max-width: 55%;

  font-size: 0.72rem;
  font-weight: 700;
  text-align: right;
  opacity: 0.75;
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
