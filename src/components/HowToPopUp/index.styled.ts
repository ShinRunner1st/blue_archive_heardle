import styled from "styled-components";

export const Steps = styled.ol`
  display: flex;
  flex-direction: column;
  gap: 12px;

  width: 100%;
  margin: 0;
  padding: 0;

  list-style: none;
  counter-reset: step;
`;

export const Step = styled.li`
  display: flex;
  gap: 12px;
  align-items: flex-start;

  counter-increment: step;

  /* The number badge is generated, so the markup stays a plain list. */
  &::before {
    content: counter(step);

    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;

    width: 26px;
    height: 26px;
    margin-top: 1px;

    font-size: 0.78rem;
    font-weight: 800;
    color: ${({ theme }) => theme.background1};

    background-color: ${({ theme }) => theme.green};
    border-radius: 50%;
  }
`;

export const StepBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
`;

export const StepTitle = styled.span`
  font-size: 0.9rem;
  font-weight: 700;
`;

export const StepText = styled.span`
  font-size: 0.82rem;
  line-height: 1.45;
  opacity: 0.78;
`;

export const Shortcuts = styled.dl`
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 9px 14px;
  align-items: center;

  width: 100%;
  margin: 0;

  dt {
    justify-self: start;
  }

  dd {
    margin: 0;
    font-size: 0.82rem;
    opacity: 0.78;
  }
`;

export const Key = styled.kbd`
  display: inline-block;

  min-width: 30px;
  padding: 3px 9px;

  font-family: inherit;
  font-size: 0.75rem;
  font-weight: 700;
  text-align: center;
  white-space: nowrap;

  background-color: rgba(241, 247, 237, 0.12);
  border: 1px solid rgba(241, 247, 237, 0.22);
  border-bottom-width: 2px;
  border-radius: 5px;
`;
