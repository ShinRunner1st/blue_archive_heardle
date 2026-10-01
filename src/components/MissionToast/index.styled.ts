import styled, { keyframes } from "styled-components";

const GOLD = "#f5c542";

const slideIn = keyframes`
  from { opacity: 0; transform: translate(-50%, -16px); }
  to { opacity: 1; transform: translate(-50%, 0); }
`;

/**
 * Over the page under the header, never moving the layout. Just below the
 * header (10), so the ☰ menu's panel opens over it and stays clickable, and
 * below the pop-ups (10) too.
 */
export const Toast = styled.div`
  position: fixed;
  top: 92px;
  left: 50%;
  z-index: 9;

  display: flex;
  align-items: stretch;

  width: min(420px, calc(100vw - 32px));

  color: #1d2b44;
  background: linear-gradient(100deg, #ffffff 0%, #eaf4ff 100%);
  border-left: 6px solid ${GOLD};
  border-radius: 10px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);

  transform: translate(-50%, 0);
  animation: ${slideIn} 0.3s ease-out;
`;

export const Open = styled.button`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  flex: 1;
  min-width: 0;

  padding: 10px 6px 10px 14px;

  font: inherit;
  color: inherit;
  text-align: left;

  background: none;
  border: 0;
`;

/** Slanted and gold, like the game's mission banner. */
export const Label = styled.span`
  padding: 1px 8px;

  font-size: 0.7rem;
  font-weight: 900;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #2b2000;

  background-color: ${GOLD};
  border-radius: 3px;
  transform: skewX(-10deg);
`;

export const Title = styled.span`
  font-size: 1rem;
  font-weight: 800;
`;

export const Unlock = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;

  font-size: 0.8rem;
  font-weight: 700;
  color: #6b5413;
`;

export const Close = styled.button`
  display: flex;
  align-items: flex-start;

  padding: 10px 10px 0 4px;

  font-size: 1.1rem;
  color: #6b7a90;

  background: none;
  border: 0;
`;
