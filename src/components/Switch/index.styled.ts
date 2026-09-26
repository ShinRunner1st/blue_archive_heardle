import styled from "styled-components";

/** On/off indicator for a switch; the knob slides across. */
export const Switch = styled.span<{ $on: boolean }>`
  position: relative;
  flex-shrink: 0;

  width: 36px;
  height: 20px;
  margin-left: auto;

  background-color: ${({ theme, $on }) =>
    $on ? theme.green : "rgba(255, 255, 255, 0.25)"};
  border-radius: 999px;

  transition: background-color 0.2s ease;

  &::after {
    content: "";

    position: absolute;
    top: 2px;
    left: 2px;

    width: 16px;
    height: 16px;

    background-color: ${({ theme }) => theme.text};
    border-radius: 50%;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);

    transform: translateX(${({ $on }) => ($on ? "16px" : "0")});
    transition: transform 0.2s cubic-bezier(0.2, 0.9, 0.3, 1.2);
  }
`;
