import React from "react";

import { Border } from "../../constants/cosmetics";

import * as Styled from "./index.styled";

type Corner = "tl" | "tr" | "bl" | "br";
const CORNERS: Corner[] = ["tl", "tr", "bl", "br"];

/** A corner's ornament, drawn for its border's kind; none for the others. */
function Ornament({ border, corner }: { border: Border; corner: Corner }) {
  const [line, accent = line] = border.colors;
  let shape: React.ReactNode = null;
  switch (border.kind) {
    case "filigree":
      shape = (
        <>
          <path
            d="M3 21V9a6 6 0 0 1 6-6h12"
            stroke={line}
            strokeWidth="2.4"
            fill="none"
          />
          <path
            d="M7 21v-8a6 6 0 0 1 6-6h8"
            stroke={accent}
            strokeWidth="1.2"
            fill="none"
          />
          <circle cx="4.5" cy="4.5" r="2.6" fill={accent} />
        </>
      );
      break;
    case "petals":
      shape = [
        [7, 7, 0],
        [17, 4, 30],
      ].map(([x, y, turn]) => (
        <g key={x} transform={`translate(${x} ${y}) rotate(${turn})`}>
          <ellipse cy="-3.2" rx="2.4" ry="3.6" fill={accent} />
          <ellipse cy="3.2" rx="2.4" ry="3.6" fill={accent} />
          <ellipse cx="-3.2" rx="3.6" ry="2.4" fill={accent} />
          <ellipse cx="3.2" rx="3.6" ry="2.4" fill={accent} />
          <circle r="1.6" fill="#FFE27A" />
        </g>
      ));
      break;
    case "halo":
      // On two corners only: a halo floats, it doesn't fence.
      if (corner === "tr" || corner === "bl") return null;
      shape = (
        <>
          <ellipse
            cx="11"
            cy="9"
            rx="9"
            ry="4.2"
            stroke={accent}
            strokeWidth="2.2"
            fill="none"
          />
          <path
            d="M11 2v3M4 4l2 2M18 4l-2 2"
            stroke={accent}
            strokeWidth="1.6"
          />
        </>
      );
      break;
    case "prism":
      shape = (
        <path
          d="M12 2l2.6 6.4L21 9l-5 4.4L17.4 20 12 16.6 6.6 20 8 13.4 3 9l6.4-.6z"
          fill="#FFFFFF"
        />
      );
      break;
    default:
      return null;
  }
  return (
    <Styled.Ornament viewBox="0 0 24 24" aria-hidden="true" $corner={corner}>
      {shape}
    </Styled.Ornament>
  );
}

/**
 * A profile's border around its card: a line, or one drawn with ornaments
 * on the corners, a glow or a gradient, as its kind says (BORDER_KINDS).
 */
export function ProfileFrame({
  border,
  children,
}: {
  border: Border;
  children: React.ReactNode;
}) {
  return (
    <Styled.Frame>
      {CORNERS.map((corner) => (
        <Ornament key={corner} border={border} corner={corner} />
      ))}
      <Styled.FrameInner $kind={border.kind} $colors={border.colors}>
        {children}
      </Styled.FrameInner>
    </Styled.Frame>
  );
}
