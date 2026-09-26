import styled from "styled-components";

import { PopUpCard } from "../PopUp";

/** A whole card that toggles its setting, switch on the right. */
export const Setting = styled(PopUpCard).attrs({ as: "button" })`
  align-items: center;

  font-family: inherit;
  text-align: left;
  color: ${({ theme }) => theme.text};

  cursor: pointer;

  &:hover {
    border-color: rgba(241, 247, 237, 0.22);
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.border};
    outline-offset: 2px;
  }
`;
