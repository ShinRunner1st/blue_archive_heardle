import React from "react";

import {
  Artists as Chips,
  MoreButton,
  MoreIcon,
  Summary,
} from "../SongListPopUp/index.styled";

interface Props {
  id: string;
  /** Names the group of chips for screen readers. */
  label: string;
  /** Left of the summary line: the song count. */
  summary: React.ReactNode;
  /** The unfold button's words, folded and unfolded. */
  more: string;
  fewer: string;
  children: React.ReactNode;
}

/**
 * Filter chips that fold to one row, with a button under them to show the
 * rest, offered only when they don't fit - so any number of chips fits
 * without the list below moving. All OST's artists and the Jukebox's albums.
 */
export function FoldingChips({
  id,
  label,
  summary,
  more,
  fewer,
  children,
}: Props) {
  const chipsRef = React.useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = React.useState(false);
  const [overflows, setOverflows] = React.useState(false);

  React.useLayoutEffect(() => {
    const chips = chipsRef.current;
    if (!chips || expanded) return;

    const measure = () =>
      setOverflows(chips.scrollHeight > chips.clientHeight + 1);
    measure();

    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(chips);
    return () => observer.disconnect();
  }, [expanded]);

  return (
    <>
      <Chips
        ref={chipsRef}
        id={id}
        role="group"
        aria-label={label}
        $expanded={expanded}
      >
        {children}
      </Chips>

      <Summary>
        {summary}
        {(overflows || expanded) && (
          <MoreButton
            type="button"
            onClick={() => setExpanded((was) => !was)}
            aria-expanded={expanded}
            aria-controls={id}
          >
            {expanded ? fewer : more}
            <MoreIcon $expanded={expanded} aria-hidden="true" />
          </MoreButton>
        )}
      </Summary>
    </>
  );
}
