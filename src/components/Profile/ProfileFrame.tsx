import React from "react";

import {
  cornerShapes,
  Frame,
  FRAME_CORNERS,
  FrameCorner,
  OrnamentShape,
} from "../../constants/cosmetics";
import { backupUrlFor } from "../../helpers/audioUrl";
import { pictureUrl } from "../../helpers/season";

import { DriftLayer, paletteColors } from "./Drift";
import * as Styled from "./index.styled";

/** One shape of an ornament, its colours from the frame's palette. */
export function OrnamentShapeView({
  shape,
  colors,
}: {
  shape: OrnamentShape;
  colors: string[];
}) {
  const paint = {
    fill: shape.fill === undefined ? "none" : colors[shape.fill],
    fillRule: shape.evenOdd ? ("evenodd" as const) : undefined,
    stroke: shape.stroke === undefined ? undefined : colors[shape.stroke],
    strokeWidth: shape.stroke === undefined ? undefined : shape.strokeWidth,
    transform: shape.at
      ? `translate(${shape.at[0]} ${shape.at[1]}) rotate(${shape.at[2]})${
          shape.at[3] === undefined ? "" : ` scale(${shape.at[3]})`
        }`
      : undefined,
  };
  switch (shape.shape) {
    case "picture":
      return (
        <ShapePicture
          key={shape.picture}
          picture={shape.picture ?? ""}
          box={[shape.cx ?? 0, shape.cy ?? 0, shape.r ?? 0]}
          transform={paint.transform}
        />
      );
    case "path":
      return <path d={shape.d} {...paint} />;
    case "circle":
      return <circle cx={shape.cx} cy={shape.cy} r={shape.r} {...paint} />;
    case "ellipse":
      return (
        <ellipse
          cx={shape.cx}
          cy={shape.cy}
          rx={shape.rx}
          ry={shape.ry}
          {...paint}
        />
      );
  }
}

/**
 * A picture as a shape: a square on the Worker, or its copy on R2, gone if
 * both fail (as WorkerPicture does for an <img>).
 */
function ShapePicture({
  picture,
  box: [cx, cy, r],
  transform,
}: {
  picture: string;
  box: [number, number, number];
  transform?: string;
}) {
  const [src, setSrc] = React.useState<string | null>(() =>
    pictureUrl(picture)
  );
  if (!src) return null;
  return (
    <image
      href={src}
      x={cx - r}
      y={cy - r}
      width={r * 2}
      height={r * 2}
      transform={transform}
      // React listens for an <image>'s error as for an <img>'s.
      // eslint-disable-next-line react/no-unknown-property
      onError={() => {
        const backup = backupUrlFor(src);
        setSrc(backup && backup !== src ? backup : null);
      }}
    />
  );
}

/**
 * A corner's ornament: the shared one, drawn for the top left and turned
 * to its corner, or the corner's own, drawn as it shows there.
 */
function Ornament({ frame, corner }: { frame: Frame; corner: FrameCorner }) {
  const drawn = cornerShapes(frame.ornament, corner);
  if (!drawn) return null;
  return (
    <Styled.Ornament
      viewBox="0 0 24 24"
      aria-hidden="true"
      $corner={corner}
      $turned={drawn.turned}
      $spill={drawn.shapes.some(({ shape }) => shape === "picture")}
    >
      {drawn.shapes.map((shape, i) => (
        <OrnamentShapeView key={i} shape={shape} colors={frame.colors} />
      ))}
    </Styled.Ornament>
  );
}

/**
 * A profile's frame around its card, or round the whole profile pop-up,
 * drawn from its parts: a border, a line inside it, glows and an ornament
 * on the corners, and what moves: the border turning, the glows
 * breathing, things twinkling round its edge.
 */
export function ProfileFrame({
  frame,
  popUp = false,
  children,
}: {
  frame: Frame;
  /** Round a pop-up: as wide as it, a sheet's shape on a phone. */
  popUp?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Styled.Frame $popUp={popUp}>
      {frame.border.spin && <Styled.FrameTurnProperty />}
      {FRAME_CORNERS.map((corner) => (
        <Ornament key={corner} frame={frame} corner={corner} />
      ))}
      {frame.drift && (
        <DriftLayer
          drift={frame.drift}
          colors={paletteColors(frame.colors, frame.drift.colors)}
          seed={`frame:${frame.id}`}
          edge
        />
      )}
      <Styled.FrameInner $frame={frame} $popUp={popUp}>
        {children}
      </Styled.FrameInner>
    </Styled.Frame>
  );
}
