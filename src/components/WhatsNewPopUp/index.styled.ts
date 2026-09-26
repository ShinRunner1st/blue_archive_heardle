import styled from "styled-components";

/** Marks the newest update, so it stands out from the ones before it. */
export const NewTag = styled.span`
  margin-left: 8px;
  padding: 1px 7px;

  font-size: 0.62rem;
  letter-spacing: 0.8px;
  vertical-align: 1px;

  color: #fff;
  background-color: ${({ theme }) => theme.green};
  border-radius: 999px;
`;
