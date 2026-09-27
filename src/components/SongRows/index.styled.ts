import styled from "styled-components";

/**
 * Every row of a song list is styled from here, by class name, rather than
 * each row being a styled component of its own: with all 345 songs shown,
 * making that many styled elements was most of the time a list took to open
 * or refilter.
 *
 * Each row is its own grid with fixed number and artist columns, so a row's
 * layout never waits on the others, and rows off screen are skipped until
 * they scroll into view (content-visibility), which a shared, content-sized
 * grid wouldn't allow.
 */
export const Rows = styled.ul`
  margin: 0;
  padding: 4px;
  list-style: none;

  > li {
    content-visibility: auto;
    contain-intrinsic-size: auto 40px;
  }

  .row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 3ch 8.5rem;
    align-items: center;
    column-gap: 8px;

    width: 100%;
    padding: 9px 10px;

    font-family: inherit;
    font-size: 0.95rem;
    text-align: left;
    color: ${({ theme }) => theme.text};

    background-color: transparent;
    border: none;
    border-radius: 5px;
    cursor: pointer;

    &[aria-pressed="true"] {
      background-color: ${({ theme }) => theme.background100};
    }

    &[data-dim="true"] {
      opacity: 0.5;
    }

    &[data-strong="true"] {
      font-weight: 700;
    }

    /* Colour only, never size, so a pointer on the line between two rows
       can't flick between them. */
    &:hover {
      background-color: ${({ theme }) => theme.background100};
    }

    &:focus-visible {
      outline: 2px solid ${({ theme }) => theme.border};
      outline-offset: -2px;
    }

    @media (max-width: 480px) {
      grid-template-columns: minmax(0, 1fr) 3ch 6.5rem;
    }
  }

  .name-cell {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  }

  .name {
    flex: 1;
    min-width: 0;
  }

  .tag {
    flex-shrink: 0;
    padding: 1px 6px;

    font-size: 0.7rem;
    font-weight: 700;

    border: 1px solid currentColor;
    border-radius: 4px;
  }

  .mark {
    flex-shrink: 0;
    font-size: 17px;
    color: ${({ theme }) => theme.green};
  }

  .theme-no {
    font-size: 0.8rem;
    font-variant-numeric: tabular-nums;
    text-align: right;
    opacity: 0.55;
  }

  /* The artist, small, at the end of the row; a long name is shortened, with
     the whole of it on hover. */
  .artist {
    box-sizing: border-box;
    padding: 2px 8px;

    font-size: 0.68rem;
    font-weight: 500;
    line-height: 1.4;
    text-align: center;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    color: lightblue;

    background-color: rgba(255, 255, 255, 0.08);
    border-radius: 999px;
  }
`;
