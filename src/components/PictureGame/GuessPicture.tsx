import React from "react";

import {
  PICTURE_SHEETS,
  PictureKind,
  SHAPE_SHEETS,
  SheetLayout,
  SHOWN_SIZE,
} from "../../constants/guessSheets";
import { answerOf, sheetCount } from "../../helpers/pictureRounds";
import { useIconSheet } from "../../hooks/useIconSheet";

import * as Styled from "./index.styled";

/** Where a cell sits in its sheet, drawn at `scale`. */
function cellStyle(
  sheet: string | null,
  layout: SheetLayout,
  cell: number,
  count: number,
  scale: number
): React.CSSProperties {
  const rows = Math.ceil(count / layout.columns);
  const x = (cell % layout.columns) * layout.cellWidth;
  const y = Math.floor(cell / layout.columns) * layout.cellHeight;
  // The cell's margin round the picture's box is left out of what shows.
  const marginX = (layout.cellWidth - layout.width) / 2;
  const marginY = (layout.cellHeight - layout.height) / 2;
  const style: React.CSSProperties = {
    width: layout.width * scale,
    height: layout.height * scale,
  };
  if (!sheet) return style;
  return {
    ...style,
    backgroundImage: `url("${sheet}")`,
    backgroundSize: `${layout.columns * layout.cellWidth * scale}px ${
      rows * layout.cellHeight * scale
    }px`,
    backgroundPosition: `-${(x + marginX) * scale}px -${
      (y + marginY) * scale
    }px`,
  };
}

interface CellProps {
  kind: PictureKind;
  /** The picture's cell, in the picture sheet or the shape sheet. */
  cell: number;
  /** From the shape sheet: the silhouette, rather than the picture. */
  shape?: boolean;
  /** Of the size it shows at during a round (SHOWN_SIZE). */
  zoom?: number;
  /** Tells when the sheet has loaded, for time attack's clock. */
  onReady?: () => void;
}

/**
 * One cell of a kind's picture or shape sheet, by its place alone: a
 * multiplayer room sends only that, so the page never knows whose it is.
 */
export function PictureCell({
  kind,
  cell,
  shape = false,
  zoom = 1,
  onReady,
}: CellProps) {
  const layout = (shape ? SHAPE_SHEETS : PICTURE_SHEETS)[kind];
  const sheet = useIconSheet(layout.key);

  React.useEffect(() => {
    if (sheet) onReady?.();
  }, [sheet, onReady]);

  const scale = (SHOWN_SIZE[kind].width / layout.width) * zoom;
  const style = cellStyle(sheet, layout, cell, sheetCount(kind), scale);

  return (
    <Styled.Picture
      role="img"
      aria-label={
        shape
          ? `The ${kind === "halo" ? "halo" : "weapon"}'s silhouette`
          : `The ${kind === "halo" ? "halo" : "weapon"}`
      }
      style={style}
    />
  );
}

interface Props {
  kind: PictureKind;
  /** Any student the picture belongs to. */
  id: number;
  /** Its silhouette, from the shape sheet, rather than the picture. */
  shape?: boolean;
  /** Of the size it shows at during a round (SHOWN_SIZE). */
  zoom?: number;
  /** Tells when the sheet has loaded, for time attack's clock. */
  onReady?: () => void;
}

/**
 * A halo or weapon, or its silhouette, cut from the kind's sheet. The two
 * sheets are drawn at build time, and only the one showing is loaded, so a
 * silhouette round never has the picture itself on the page.
 */
export function GuessPicture({
  kind,
  id,
  shape = false,
  zoom = 1,
  onReady,
}: Props) {
  const answer = answerOf(kind, id);
  if (!answer) return null;
  return (
    <PictureCell
      kind={kind}
      cell={shape ? answer.shape : answer.picture}
      shape={shape}
      zoom={zoom}
      onReady={onReady}
    />
  );
}
