import styled from "styled-components";

/** The student picked, with room between it and the search box under it. */
export const Favourite = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;

  margin-bottom: 10px;
`;

export const FavouriteName = styled.span`
  flex: 1;
  font-weight: 800;
`;

export const Remove = styled.button`
  padding: 4px 10px;

  font-family: inherit;
  font-size: 0.8rem;
  font-weight: 700;
  color: inherit;

  background: none;
  border: 1px solid rgba(241, 247, 237, 0.3);
  border-radius: 999px;
  cursor: pointer;

  &:hover {
    background-color: rgba(241, 247, 237, 0.08);
  }
`;

/** Above the preview, so its list opens over the card, not off the end. */
export const Picker = styled.div`
  position: relative;
  z-index: 2;
  width: 100%;
`;

/** The card as drawn, the width of the pop-up. */
export const Preview = styled.div`
  width: 100%;
  aspect-ratio: 1200 / 756;

  display: flex;
  align-items: center;
  justify-content: center;

  background-color: rgba(0, 0, 0, 0.2);
  border-radius: 12px;
  overflow: hidden;

  img {
    display: block;
    width: 100%;
    height: auto;
  }
`;

export const Drawing = styled.span`
  font-weight: 700;
  opacity: 0.7;
`;

export const Note = styled.p`
  margin: 0;
  font-size: 0.82rem;
  opacity: 0.75;
  text-align: center;
`;
