import styled from "styled-components";
import "@fontsource-variable/nunito-sans";

/** Matches the song list's artist tag, so tags read the same everywhere. */
export const Tag = styled.span`
  flex-shrink: 0;

  display: inline-flex;
  align-items: center;
  gap: 4px;

  margin-left: 8px;
  padding: 2px 8px;

  font-family: "Nunito Sans Variable";
  font-size: 0.72rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  line-height: 1.4;
  white-space: nowrap;
  color: ${({ theme }) => theme.text};

  background-color: rgba(255, 255, 255, 0.1);
  border-radius: 999px;
`;

export const Arrow = styled.span`
  font-size: 0.8rem;
  line-height: 1;
`;
