import styled from "styled-components";
import "@fontsource-variable/nunito-sans";

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
     it has been scrolled. */
  position: fixed;
  inset: 0;
  z-index: 2;

  display: flex;
  align-items: center;
  justify-content: center;

  overflow-y: auto;
  padding: 24px 16px;

  background-color: ${({ theme }) => theme.overlay};
  backdrop-filter: blur(3px);
`;

export const Panel = styled.div`
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

  width: 100%;
  max-width: 430px;
  padding: 26px 24px 20px;

  @media (max-width: 480px) {
    padding: 22px 18px 18px;
  }

  display: flex;
  flex-direction: column;
  align-items: center;

  color: ${({ theme }) => theme.text};
  background-color: ${({ theme }) => theme.background100};

  border: 1px solid rgba(241, 247, 237, 0.16);
  border-radius: 16px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.45);

  &:focus {
    outline: none;
  }
`;

export const Title = styled.h2`
  margin: 0;

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

export const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: center;

  width: 100%;
  margin-top: 20px;
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
