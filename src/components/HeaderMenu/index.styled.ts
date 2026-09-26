import styled from "styled-components";
import "@fontsource-variable/nunito-sans";

export const Wrapper = styled.div`
  position: relative;
  display: flex;
`;

export const Toggle = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;

  padding: 4px;
  margin: 0;

  font-size: inherit;
  color: ${({ theme }) => theme.text};
  background: none;
  border: none;
  border-radius: 6px;
  cursor: pointer;

  transition: transform 0.15s ease, opacity 0.15s ease;

  &:hover {
    opacity: 0.8;
    transform: scale(1.08);
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.border};
    outline-offset: 2px;
  }
`;

/** Turns the bars into a cross, and back, with a quarter spin. */
export const ToggleIcon = styled.span`
  display: flex;

  animation: menu-icon-in 0.25s ease-out;

  @keyframes menu-icon-in {
    from {
      opacity: 0;
      transform: rotate(-90deg);
    }
    to {
      opacity: 1;
      transform: rotate(0);
    }
  }
`;

export const Panel = styled.div`
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  /*
   * Above the page, including the result card's timeline (2). Pop-ups never
   * overlap it: anything that opens one closes this first.
   */
  z-index: 3;

  display: flex;
  flex-direction: column;

  min-width: 210px;
  padding: 6px;

  font-family: "Nunito Sans Variable";

  background-color: ${({ theme }) => theme.background100};
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 12px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.45);

  transform-origin: top right;
  animation: menu-in 0.18s cubic-bezier(0.2, 0.9, 0.3, 1);

  @keyframes menu-in {
    from {
      opacity: 0;
      transform: translateY(-6px) scale(0.96);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }
`;

export const Item = styled.button`
  display: flex;
  align-items: center;
  gap: 12px;

  width: 100%;
  padding: 10px 12px;

  font-family: inherit;
  font-size: 0.95rem;
  font-weight: 700;
  text-align: left;
  white-space: nowrap;
  color: ${({ theme }) => theme.text};

  background: none;
  border: none;
  border-radius: 8px;
  cursor: pointer;

  svg {
    flex-shrink: 0;
    font-size: 20px;
  }

  &:hover {
    background-color: ${({ theme }) => theme.surface};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.border};
    outline-offset: -2px;
  }
`;

export const Divider = styled.hr`
  width: calc(100% - 16px);
  margin: 4px auto;

  border: none;
  border-top: 1px solid rgba(255, 255, 255, 0.12);
`;
