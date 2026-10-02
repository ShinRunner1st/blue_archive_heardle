import React from "react";

import type { Drift, NameEffect } from "../../constants/cosmetics";
import { driftLayout } from "../../helpers/drift";

import * as Styled from "./card.styled";

/**
 * Things drifting over a cosmetic: petals, snow, sparks. Each a span the
 * browser moves by itself, laid out from the cosmetic's id (`seed`), so
 * no script runs while they move. Decorative, and lets presses through.
 */
export function DriftLayer({
  drift,
  colors,
  seed,
  edge = false,
}: {
  drift: Drift<unknown>;
  /** Its colours, as hex: a frame's places in its palette looked up. */
  colors: string[];
  seed: string;
  /** Round a frame's edge, clear of the card's words. */
  edge?: boolean;
}) {
  const motes = React.useMemo(
    () => driftLayout(drift, colors, seed, edge),
    [drift, colors, seed, edge]
  );
  return (
    <Styled.DriftBox $edge={edge} aria-hidden="true">
      {motes.map((mote, i) => {
        const style = {
          "--x": `${mote.x}%`,
          "--y": `${mote.y}%`,
          "--seconds": `${mote.seconds}s`,
          "--delay": `${mote.delay}s`,
          "--size": `${mote.size}px`,
          "--color": mote.color,
          "--sway": `${mote.sway}px`,
          "--turn": `${mote.turn}deg`,
        } as React.CSSProperties;
        const thing = (
          <Styled.Mote
            $shape={drift.shape}
            $way={drift.way}
            style={drift.way === "twinkle" ? style : undefined}
          />
        );
        return drift.way === "twinkle" ? (
          <React.Fragment key={i}>{thing}</React.Fragment>
        ) : (
          <Styled.DriftLane
            key={i}
            $way={drift.way}
            style={{ ...style, left: `${mote.x}%` }}
          >
            {thing}
          </Styled.DriftLane>
        );
      })}
    </Styled.DriftBox>
  );
}

/** A frame's or a drift's colours, from places in its palette. */
export const paletteColors = (palette: string[], places: number[]) =>
  places.map((at) => palette[at]);

/** A name in its effect, or as it ever was with the plain one. */
export function NameInk({
  effect,
  children,
}: {
  effect: NameEffect | undefined;
  children: React.ReactNode;
}) {
  if (!effect || effect.blank) return <>{children}</>;
  return <Styled.NameInk $effect={effect}>{children}</Styled.NameInk>;
}
