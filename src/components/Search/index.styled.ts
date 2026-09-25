import styled from "styled-components";
import "@fontsource-variable/nunito-sans";

interface ResultProps {
  $isFocused?: boolean;
}

export const Container = styled.div`
  font-family: "Nunito Sans Variable";
  position: relative;

  width: 100%;

  margin-top: 5%;

  @media (max-width: 768px) {
  }
`;

/** The search box with the browse button beside it. */
export const Row = styled.div`
  display: flex;
  gap: 8px;
`;

export const BrowseButton = styled.button`
  flex-shrink: 0;

  display: flex;
  align-items: center;
  justify-content: center;

  width: 45px;
  height: 45px;
  padding: 0;

  color: ${({ theme }) => theme.text};

  background-color: ${({ theme }) => theme.background1};
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 5px;
  cursor: pointer;

  transition: opacity 0.15s ease;

  &:hover {
    opacity: 0.8;
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.border};
    outline-offset: 2px;
  }

  @media (max-width: 768px) {
    width: 36px;
    height: 36px;
  }
`;

export const SearchContainer = styled.div`
  font-family: "Nunito Sans Variable";
  display: flex;
  align-items: center;

  width: 100%;
  height: 45px;

  @media (max-width: 768px) {
    height: 36px;
  }

  border-color: ${({ theme }) => theme.border};
  border-width: 1px;
  border-radius: 5px;
  border-style: solid;

  background-color: ${({ theme }) => theme.background1};

  color: ${({ theme }) => theme.text};
`;

export const SearchPadding = styled.div`
  display: flex;
  align-items: center;

  width: 100%;

  padding: 0 15px;
`;

export const Input = styled.input`
  font-family: "Nunito Sans Variable";
  width: 100%;
  height: 100%;
  margin: 0 10px;

  background-color: transparent;
  border: none;
  outline: none !important;

  color: ${({ theme }) => theme.text};
  font-size: 1rem;
`;

export const ResultsContainer = styled.div`
  font-family: "Nunito Sans Variable";
  position: absolute;
  bottom: 47px;
  z-index: 1;

  @media (max-width: 768px) {
    bottom: 38px;
  }

  display: flex;
  flex-direction: column;
  justify-content: flex-end;

  width: 100%;

  overflow-y: auto;
`;

export const Result = styled.div<ResultProps>`
  font-family: "Nunito Sans Variable";
  padding: 0px 15px;

  height: 45px;

  @media (max-width: 768px) {
    height: 36px;
  }

  display: flex; /* ✅ */
  align-items: center; /* ✅ */
  justify-content: space-between; /* ✅ */

  background-color: ${({ theme, $isFocused }) =>
    $isFocused ? theme.background100 : theme.background1};

  border-color: ${({ theme }) => theme.border};
  border-width: 1px;
  border-radius: 5px;
  border-style: solid;

  color: ${({ theme }) => theme.text};

  cursor: pointer;
  &:hover {
    background-color: ${({ theme }) => theme.background100};
  }
`;

export const ResultText = styled.p`
  font-family: "Nunito Sans Variable";

  color: ${({ theme }) => theme.text};
  font-size: 0.9rem;

  user-select: none;

  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
`;

export const ThemeNo = styled.span`
  font-size: 0.8rem;
  opacity: 0.7;
  white-space: nowrap;
  margin-left: 8px;
`;

export const ClearButton = styled.button`
  display: flex;
  align-items: center;

  margin-left: 8px;
  padding: 0;

  color: inherit;
  background: none;
  border: none;
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.border};
    outline-offset: 2px;
    border-radius: 4px;
  }
`;

/** Visually hidden, but still read out by assistive technology. */
export const LiveRegion = styled.span`
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
`;
