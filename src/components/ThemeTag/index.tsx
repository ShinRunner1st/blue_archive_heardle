import * as Styled from "./index.styled";

interface Props {
  themeNo: string;
  /**
   * Which way the answer lies from this song, on a guess that missed. Absent
   * on search results, which aren't compared with anything.
   */
  direction?: "up" | "down";
}

const ARROWS = {
  up: { symbol: "↑", label: "The answer has a higher theme number" },
  down: { symbol: "↓", label: "The answer has a lower theme number" },
} as const;

/** A song's theme number as a small pill, used in search results and guesses. */
export function ThemeTag({ themeNo, direction }: Props) {
  const arrow = direction ? ARROWS[direction] : null;

  return (
    <Styled.Tag>
      Theme {themeNo}
      {arrow && (
        <Styled.Arrow role="img" aria-label={arrow.label} title={arrow.label}>
          {arrow.symbol}
        </Styled.Arrow>
      )}
    </Styled.Tag>
  );
}
