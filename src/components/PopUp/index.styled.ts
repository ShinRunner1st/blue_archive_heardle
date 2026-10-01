import styled from "styled-components";
import "@fontsource-variable/nunito-sans";

import { slimScrollbar } from "./scrollbar";

export const Overlay = styled.div`
  animation: op 0.2s ease-out;

  @keyframes op {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  /* Fixed so the overlay always covers the viewport, even when the page below
     it has been scrolled. Edges rather than inset, for older Safari. */
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  /* Over everything on the page, the footer (2) and the menu (3) included. */
  z-index: 10;

  display: flex;
  align-items: center;
  justify-content: center;

  padding: 24px 16px;

  background-color: ${({ theme }) => theme.overlay};
  -webkit-backdrop-filter: blur(3px);
  backdrop-filter: blur(3px);

  /* A sheet on phones: the panel sits on the bottom edge, in thumb reach. */
  @media (max-width: 480px) {
    align-items: flex-end;
    padding: 12px 0 0;
  }
`;

export const Panel = styled.div<{ $wide?: boolean }>`
  animation: popup 0.22s cubic-bezier(0.2, 0.9, 0.3, 1);

  @keyframes popup {
    from {
      opacity: 0;
      transform: translateY(8px) scale(0.97);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  font-family: "Nunito Sans Variable";

  position: relative;
  display: flex;
  flex-direction: column;

  width: 100%;
  max-width: ${({ $wide }) => ($wide ? "960px" : "430px")};
  /* Never taller than the screen, whatever the browser's toolbars do. dvh
     follows them where supported; vh is the fallback. */
  max-height: calc(100vh - 48px);
  max-height: calc(100dvh - 48px);
  overflow: hidden;

  color: ${({ theme }) => theme.text};
  background-color: ${({ theme }) => theme.background100};

  border: 1px solid rgba(241, 247, 237, 0.16);
  border-radius: 16px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.45);

  &:focus {
    outline: none;
  }

  @media (max-width: 480px) {
    animation-name: sheet;
    max-width: none;
    max-height: calc(100vh - 12px);
    max-height: calc(100dvh - 12px);

    border-width: 1px 0 0;
    border-radius: 18px 18px 0 0;

    @keyframes sheet {
      from {
        transform: translateY(40px);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }
  }
`;

/** The title block, fixed above the scrolling body. */
export const Head = styled.div`
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;

  padding: 26px 24px 0;

  @media (max-width: 480px) {
    padding: 22px 18px 0;
  }

  /* The divider ends the head; the body's padding gives the space below. */
  & > div:last-child {
    margin-bottom: 0;
  }
`;

export const Close = styled.button`
  position: absolute;
  top: 12px;
  right: 12px;

  display: flex;
  align-items: center;
  justify-content: center;

  width: 32px;
  height: 32px;
  padding: 0;

  font-size: 20px;
  color: ${({ theme }) => theme.text};
  background: rgba(241, 247, 237, 0.08);
  border: none;
  border-radius: 50%;
  cursor: pointer;
  opacity: 0.75;

  transition: opacity 0.15s ease, background-color 0.15s ease;

  &:hover {
    opacity: 1;
    background: rgba(241, 247, 237, 0.16);
  }

  &:focus-visible {
    opacity: 1;
    outline: 2px solid ${({ theme }) => theme.border};
    outline-offset: 2px;
  }
`;

/** The body: the one part that scrolls when the content is taller than the screen. */
export const Scroll = styled.div`
  /* Its top padding stands in for the head divider's lower margin, so the
     content disappears right at the line as it scrolls. */
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
  ${slimScrollbar}

  display: flex;
  flex-direction: column;
  align-items: center;

  /* Room for the scrollbar on both sides, so the content stays centred and
     doesn't shift when a bar appears. Where bars overlay the content instead,
     the gutter is empty and the padding alone applies. */
  padding: 18px 12px 20px;
  scrollbar-gutter: stable both-edges;

  /* The body scrolls rather than squashing what is in it. */
  & > * {
    flex-shrink: 0;
  }

  @media (max-width: 480px) {
    padding: 18px 18px 18px;
    scrollbar-gutter: auto;

    /* A sheet without actions ends here, so this keeps clear of the home
       indicator. */
    &:last-child {
      padding-bottom: calc(18px + env(safe-area-inset-bottom, 0px));
    }
  }
`;

export const Title = styled.h2`
  margin: 0;
  /* Clear of the close button either side, so it stays centred. */
  padding: 0 32px;

  font-size: 1.3rem;
  font-weight: 800;
  letter-spacing: 0.2px;
  text-align: center;

  @media (max-width: 480px) {
    font-size: 1.15rem;
  }
`;

export const Subtitle = styled.p`
  margin: 6px 0 0;

  font-size: 0.84rem;
  line-height: 1.4;
  text-align: center;
  opacity: 0.68;
`;

/** Hairline that fades out at both ends rather than stopping abruptly. */
export const Divider = styled.div`
  width: 100%;
  height: 1px;
  margin: 18px 0;
  flex-shrink: 0;
  align-self: stretch;

  background: linear-gradient(
    90deg,
    transparent,
    rgba(241, 247, 237, 0.28),
    transparent
  );
`;

export const Body = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
`;

/** Small uppercase label introducing a group. */
export const GroupLabel = styled.p`
  margin: 0 0 10px;

  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 1.1px;
  text-transform: uppercase;
  opacity: 0.55;
`;

/** Inset block that sits darker than the panel, giving the content depth. */
export const Card = styled.div`
  display: flex;
  gap: 12px;
  align-items: flex-start;

  width: 100%;
  padding: 12px 14px;

  background-color: ${({ theme }) => theme.surface};
  border: 1px solid rgba(241, 247, 237, 0.09);
  border-radius: 11px;

  & + & {
    margin-top: 9px;
  }
`;

export const CardIcon = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  width: 34px;
  height: 34px;

  font-size: 19px;

  background-color: rgba(241, 247, 237, 0.1);
  border-radius: 10px;
`;

export const CardBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
`;

export const CardTitle = styled.span`
  font-size: 0.9rem;
  font-weight: 700;
`;

export const CardText = styled.span`
  font-size: 0.82rem;
  line-height: 1.45;
  opacity: 0.78;

  a {
    color: ${({ theme }) => theme.text};
    text-underline-offset: 2px;

    &:hover {
      text-decoration: underline;
    }

    &:focus-visible {
      outline: 2px solid ${({ theme }) => theme.border};
      outline-offset: 2px;
      border-radius: 2px;
    }
  }
`;

/** Rounded pill, used for the search-by options. */
export const Chips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

export const Chip = styled.span`
  padding: 5px 12px;

  font-size: 0.8rem;
  font-weight: 600;

  background-color: rgba(241, 247, 237, 0.1);
  border: 1px solid rgba(241, 247, 237, 0.16);
  border-radius: 999px;
`;

export const Meta = styled.p`
  margin: 16px 0 0;

  font-size: 0.71rem;
  letter-spacing: 0.3px;
  text-align: center;
  opacity: 0.5;
`;

/** The buttons, pinned below the scrolling body. */
export const Actions = styled.div`
  flex-shrink: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: center;

  padding: 14px 24px 20px;
  /* Clear of the home indicator on phones with one. */
  padding-bottom: calc(20px + env(safe-area-inset-bottom, 0px));

  border-top: 1px solid rgba(241, 247, 237, 0.1);
`;

/** Kept for the stats rows, which lay out as label / bar / count. */
export const Section = styled.div`
  display: flex;
  gap: 10px;
  align-items: center;

  margin: 8px;
  font-weight: bold;

  a {
    color: ${({ theme }) => theme.text};
  }

  @media (max-width: 480px) {
    gap: 6px;
    font-size: 0.9rem;
  }
`;
