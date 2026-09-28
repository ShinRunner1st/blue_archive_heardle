import React from "react";

import { students } from "../../constants/students";
import {
  ICON_BACKGROUND,
  ICON_CELL,
  ICON_COLUMNS,
  ICON_SIZE,
} from "../../constants/studentIcons";
import { loadedIconSheet, loadIconSheet } from "../../helpers/iconSheet";

import * as Styled from "./index.styled";

/** Each student's cell in the sheet: their place in the table. */
const CELLS = new Map(students.map(({ id }, index) => [id, index]));
const ROWS = Math.ceil(students.length / ICON_COLUMNS);

interface Props {
  id: number;
  /** Shown size in pixels. */
  size: number;
  /** Read out, or left empty when the name is written beside the icon. */
  alt?: string;
}

/**
 * A student's icon, cut from the one sheet of every icon: the sheet's
 * colour until it has loaded, which happens once a visit.
 */
export function StudentIcon({ id, size, alt = "" }: Props) {
  const [sheet, setSheet] = React.useState(loadedIconSheet);

  React.useEffect(() => {
    if (sheet) return;
    let live = true;
    loadIconSheet().then((src) => live && setSheet(src));
    return () => {
      live = false;
    };
  }, [sheet]);

  const cell = CELLS.get(id) ?? 0;
  const scale = size / ICON_SIZE;
  const margin = (ICON_CELL - ICON_SIZE) / 2;
  const x = ((cell % ICON_COLUMNS) * ICON_CELL + margin) * scale;
  const y = (Math.floor(cell / ICON_COLUMNS) * ICON_CELL + margin) * scale;

  const style: React.CSSProperties = {
    width: size,
    height: size,
    backgroundColor: ICON_BACKGROUND,
    ...(sheet && {
      backgroundImage: `url("${sheet}")`,
      backgroundSize: `${ICON_COLUMNS * ICON_CELL * scale}px ${
        ROWS * ICON_CELL * scale
      }px`,
      backgroundPosition: `-${x}px -${y}px`,
    }),
  };

  return alt ? (
    <Styled.Icon role="img" aria-label={alt} style={style} />
  ) : (
    <Styled.Icon aria-hidden="true" style={style} />
  );
}
