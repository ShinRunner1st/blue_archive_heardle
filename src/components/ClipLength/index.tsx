import styled from "styled-components";

import { CLIP_OPTIONS } from "../../constants/game";
import { Chip } from "../SongListPopUp/index.styled";

interface Props {
  /** Seconds. */
  value: number;
  onChange: (seconds: number) => void;
}

const Options = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`;

/** Picks how much of the clip plays, for 4-Choice and time attack. */
export function ClipLength({ value, onChange }: Props) {
  return (
    <Options role="group" aria-label="Clip length">
      {CLIP_OPTIONS.map((seconds) => (
        <Chip
          key={seconds}
          type="button"
          $active={value === seconds}
          aria-pressed={value === seconds}
          onClick={() => onChange(seconds)}
        >
          {seconds}s
        </Chip>
      ))}
    </Options>
  );
}
