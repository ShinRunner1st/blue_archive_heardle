import React from "react";
import styled from "styled-components";

import { MoreButton, MoreIcon } from "../SongListPopUp/index.styled";

const Row = styled.div<{ $gap: number; $justify: string }>`
  position: relative;
  display: flex;
  flex-wrap: wrap;
  justify-content: ${({ $justify }) => $justify};
  gap: ${({ $gap }) => $gap}px;
  width: 100%;
  overflow: hidden;
`;

const Foot = styled.div<{ $justify: string }>`
  display: flex;
  justify-content: ${({ $justify }) => $justify};
  width: 100%;
  margin-top: 4px;
`;

interface Props extends React.HTMLAttributes<HTMLDivElement> {
  /** Rows shown folded. */
  rows?: number;
  gap?: number;
  justify?: "flex-start" | "center";
  children: React.ReactNode;
}

/** Whether a pill is the one picked, so it's never left out of sight. */
const isPicked = (element: Element) =>
  element.getAttribute("aria-selected") === "true" ||
  element.getAttribute("aria-checked") === "true" ||
  element.getAttribute("aria-pressed") === "true";

/**
 * A row of pills that wraps to a few rows at most, with "Show n more"
 * under it when there are more: the Missions tabs, choice rows and a
 * room's albums, which grow as content is added. It opens by itself when
 * the pill picked would be hidden.
 */
export function FoldingRow({
  rows = 2,
  gap = 6,
  justify = "flex-start",
  children,
  ...attributes
}: Props) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = React.useState(false);
  const [fold, setFold] = React.useState<{ height: number; hidden: number }>();

  React.useLayoutEffect(() => {
    const row = ref.current;
    if (!row) return;
    const measure = () => {
      const pills = [...row.children] as HTMLElement[];
      const tops = [...new Set(pills.map((pill) => pill.offsetTop))].sort(
        (a, b) => a - b
      );
      if (tops.length <= rows) {
        setFold(undefined);
        return;
      }
      const cut = tops[rows];
      const hidden = pills.filter((pill) => pill.offsetTop >= cut);
      const next = { height: cut - gap, hidden: hidden.length };
      // The same fold keeps its object, so a measure changes nothing.
      setFold((was) =>
        was?.height === next.height && was.hidden === next.hidden ? was : next
      );
      if (hidden.some(isPicked)) setExpanded(true);
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(row);
    return () => observer.disconnect();
  }, [rows, gap, children]);

  return (
    <>
      <Row
        ref={ref}
        $gap={gap}
        $justify={justify}
        style={fold && !expanded ? { maxHeight: fold.height } : undefined}
        {...attributes}
      >
        {children}
      </Row>
      {fold && (
        <Foot $justify={justify}>
          <MoreButton
            type="button"
            aria-expanded={expanded}
            onClick={() => setExpanded((was) => !was)}
          >
            {expanded ? "Show fewer" : `Show ${fold.hidden} more`}
            <MoreIcon $expanded={expanded} aria-hidden="true" />
          </MoreButton>
        </Foot>
      )}
    </>
  );
}
