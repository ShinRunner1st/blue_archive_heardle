import React from "react";

import {
  Frame,
  FRAME_CORNERS,
  FrameCorner,
  OrnamentShape,
} from "../../constants/cosmetics";

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
    stroke: shape.stroke === undefined ? undefined : colors[shape.stroke],
    strokeWidth: shape.stroke === undefined ? undefined : shape.strokeWidth,
    transform: shape.at
      ? `translate(${shape.at[0]} ${shape.at[1]}) rotate(${shape.at[2]})`
      : undefined,
  };
  switch (shape.shape) {
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

/** A corner's ornament, drawn for the top left and turned to its corner. */
function Ornament({ frame, corner }: { frame: Frame; corner: FrameCorner }) {
  const { ornament } = frame;
  if (!ornament?.corners.includes(corner)) return null;
  return (
    <Styled.Ornament viewBox="0 0 24 24" aria-hidden="true" $corner={corner}>
      {ornament.shapes.map((shape, i) => (
        <OrnamentShapeView key={i} shape={shape} colors={frame.colors} />
      ))}
    </Styled.Ornament>
  );
}

/**
 * A profile's frame around its card, or round the whole profile pop-up,
 * drawn from its parts: a border, a line inside it, glows and an ornament
 * on the corners.
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
      {FRAME_CORNERS.map((corner) => (
        <Ornament key={corner} frame={frame} corner={corner} />
      ))}
      <Styled.FrameInner $frame={frame} $popUp={popUp}>
        {children}
      </Styled.FrameInner>
    </Styled.Frame>
  );
}
