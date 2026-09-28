import styled from "styled-components";

export const Icon = styled.span`
  display: block;
  flex-shrink: 0;

  background-repeat: no-repeat;
  border-radius: 6px;
`;

/** A shadow keeps the white icons clear on a yellow or green cell. */
export const ClueIcon = styled.span`
  display: block;
  flex-shrink: 0;

  background-repeat: no-repeat;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.55));
`;
