import React from "react";

import { clueIcons } from "../../constants/clueIcons";
import { students } from "../../constants/students";
import {
  CLUE_CELL,
  CLUE_COLUMNS,
  CLUE_SHEET_KEY,
  CLUE_SIZE,
  ICON_CELL,
  ICON_COLUMNS,
  ICON_TILE,
  ICON_SHEET_KEY,
  ICON_SIZE,
} from "../../constants/studentIcons";
import { useIconSheet } from "../../hooks/useIconSheet";

import * as Styled from "./index.styled";

/** Each student's cell in the sheet: their place in the table. */
const CELLS = new Map(students.map(({ id }, index) => [id, index]));
const ROWS = Math.ceil(students.length / ICON_COLUMNS);

const CLUE_CELLS = new Map(clueIcons.map((key, index) => [key, index]));
const CLUE_ROWS = Math.ceil(clueIcons.length / CLUE_COLUMNS);

interface Layout {
  cell: number;
  cellSize: number;
  iconSize: number;
  columns: number;
  rows: number;
}

/** Where a cell of a sheet sits, drawn `size` pixels across. */
function sheetStyle(sheet: string | null, size: number, layout: Layout) {
  const scale = size / layout.iconSize;
  const margin = (layout.cellSize - layout.iconSize) / 2;
  const x = ((layout.cell % layout.columns) * layout.cellSize + margin) * scale;
  const y =
    (Math.floor(layout.cell / layout.columns) * layout.cellSize + margin) *
    scale;
  const style: React.CSSProperties = { width: size, height: size };
  if (!sheet) return style;
  return {
    ...style,
    backgroundImage: `url("${sheet}")`,
    backgroundSize: `${layout.columns * layout.cellSize * scale}px ${
      layout.rows * layout.cellSize * scale
    }px`,
    backgroundPosition: `-${x}px -${y}px`,
  };
}

interface Props {
  id: number;
  /** Shown size in pixels. */
  size: number;
  /** Read out, or left empty when the name is written beside the icon. */
  alt?: string;
}

/**
 * A student's icon, cut from the one sheet of every icon, on a faint square:
 * all that shows until the sheet has loaded, once a visit, or if it fails.
 */
export function StudentIcon({ id, size, alt = "" }: Props) {
  const sheet = useIconSheet(ICON_SHEET_KEY);
  const style: React.CSSProperties = {
    backgroundColor: ICON_TILE,
    ...sheetStyle(sheet, size, {
      cell: CELLS.get(id) ?? 0,
      cellSize: ICON_CELL,
      iconSize: ICON_SIZE,
      columns: ICON_COLUMNS,
      rows: ROWS,
    }),
  };

  return alt ? (
    <Styled.Icon role="img" aria-label={alt} style={style} />
  ) : (
    <Styled.Icon aria-hidden="true" style={style} />
  );
}

/** Whether there is a clue icon for this key, such as "school/Abydos". */
export function hasClueIcon(key: string): boolean {
  return CLUE_CELLS.has(key);
}

/**
 * A school, role or gift icon from the clue sheet, transparent round its
 * shape so it sits on a cell's colour. Nothing until the sheet has loaded.
 */
export function ClueIcon({ iconKey, size }: { iconKey: string; size: number }) {
  const sheet = useIconSheet(CLUE_SHEET_KEY);
  const style = sheetStyle(sheet, size, {
    cell: CLUE_CELLS.get(iconKey) ?? 0,
    cellSize: CLUE_CELL,
    iconSize: CLUE_SIZE,
    columns: CLUE_COLUMNS,
    rows: CLUE_ROWS,
  });
  return <Styled.ClueIcon aria-hidden="true" style={style} />;
}
