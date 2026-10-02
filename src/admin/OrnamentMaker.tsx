/**
 * An ornament made by hand: ready-made shapes picked from a library, then
 * dragged into place on a big view of the card's corner, sized, turned
 * and coloured with the shapes picked (a click picks one, Shift adds).
 */
import React from "react";
import styled from "styled-components";

import { OrnamentShapeView } from "../components/Profile/ProfileFrame";
import type {
  FrameColor,
  FrameOrnament,
  OrnamentShape,
} from "../constants/cosmetics";
import { ORNAMENT_LIBRARY, placed } from "./ornamentLibrary";
import { Button, Field, Hint, IconButton, Row } from "./ui";

/** Where a shape is: x, y, degrees and size, filled in for one without. */
type Place = [number, number, number, number];
const placeOf = (shape: OrnamentShape): Place => [
  shape.at?.[0] ?? 0,
  shape.at?.[1] ?? 0,
  shape.at?.[2] ?? 0,
  shape.at?.[3] ?? 1,
];
const tidy = (value: number) => Math.round(value * 10) / 10;

/**
 * Where the card's corner is in an ornament's box: the ornament is 26 px,
 * set 7 px out from the card, whose corners round by 16 px.
 */
const CARD_EDGE = (7 * 24) / 26;
const CARD_ROUND = (16 * 24) / 26;
const PICKED = "#4DC3FF";

const Board = styled.svg`
  width: 264px;
  height: 264px;
  flex: none;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.35);
  touch-action: none;
  cursor: default;

  [data-shape] {
    cursor: grab;
  }
`;

const LibraryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(72px, 1fr));
  gap: 6px;
  margin-bottom: 12px;
`;

const LibraryButton = styled.button.attrs({ type: "button" })`
  display: grid;
  justify-items: center;
  gap: 2px;
  padding: 6px 2px 4px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.06);
  color: inherit;
  font: inherit;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;

  &:hover {
    background: rgba(255, 255, 255, 0.14);
  }

  svg {
    width: 30px;
    height: 30px;
  }
`;

const Swatches = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
`;

const Swatch = styled.button.attrs({ type: "button" })<{ $color: string }>`
  width: 26px;
  height: 26px;
  border-radius: 6px;
  border: 2px solid rgba(255, 255, 255, 0.2);
  background: ${({ $color }) => $color};
  color: white;
  font-size: 11px;
  font-weight: 800;
  text-shadow: 0 0 3px black;
  cursor: pointer;

  &[aria-pressed="true"] {
    border-color: white;
    outline: 2px solid ${PICKED};
  }
`;

const Slider = styled.input.attrs({ type: "range" })`
  width: 100%;
`;

/** A colour of the palette for the picked shapes, or none. */
function PaintPick({
  label,
  value,
  colors,
  onChange,
}: {
  label: string;
  value: FrameColor | undefined | "mixed";
  colors: string[];
  onChange: (color: FrameColor | undefined) => void;
}) {
  return (
    <Field label={label}>
      <Swatches role="group" aria-label={label}>
        <Swatch
          $color="transparent"
          aria-pressed={value === undefined}
          aria-label={`No ${label.toLowerCase()}`}
          onClick={() => onChange(undefined)}
        >
          ⌀
        </Swatch>
        {colors.map((color, i) => (
          <Swatch
            key={i}
            $color={color}
            aria-pressed={value === i}
            aria-label={`${label}: colour ${i + 1}`}
            onClick={() => onChange(i)}
          >
            {i + 1}
          </Swatch>
        ))}
      </Swatches>
    </Field>
  );
}

/** The same value for every shape picked, or "mixed". */
function shared<T>(values: T[]): T | "mixed" {
  return values.every((value) => value === values[0]) ? values[0] : "mixed";
}

export function OrnamentMaker({
  ornament,
  colors,
  picked,
  onPick,
  onChange,
}: {
  ornament: FrameOrnament;
  colors: string[];
  /** The shapes picked, by place in the list. */
  picked: number[];
  onPick: (picked: number[]) => void;
  onChange: (shapes: OrnamentShape[]) => void;
}) {
  const board = React.useRef<SVGSVGElement>(null);
  const drag = React.useRef<{
    from: [number, number];
    places: Map<number, Place>;
  } | null>(null);
  const { shapes } = ornament;
  const chosen = picked.filter((i) => i < shapes.length);

  /** A pointer's place in the box's units. */
  const unitsAt = (event: React.PointerEvent): [number, number] => {
    const box = board.current?.getBoundingClientRect();
    if (!box) return [0, 0];
    return [
      ((event.clientX - box.left) / box.width) * 24,
      ((event.clientY - box.top) / box.height) * 24,
    ];
  };

  /** The picked shapes, each changed by `change`. */
  const changePicked = (
    change: (shape: OrnamentShape) => OrnamentShape,
    only = chosen
  ) =>
    onChange(
      shapes.map((shape, i) => (only.includes(i) ? change(shape) : shape))
    );

  const setPlace = (place: Place) => (shape: OrnamentShape) => ({
    ...shape,
    at: place.map(tidy) as Place,
  });

  const startDrag = (event: React.PointerEvent, i: number) => {
    event.stopPropagation();
    const next = event.shiftKey
      ? chosen.includes(i)
        ? chosen.filter((j) => j !== i)
        : [...chosen, i]
      : chosen.includes(i)
      ? chosen
      : [i];
    onPick(next);
    board.current?.setPointerCapture(event.pointerId);
    drag.current = {
      from: unitsAt(event),
      places: new Map(next.map((j) => [j, placeOf(shapes[j])])),
    };
  };

  const moveDrag = (event: React.PointerEvent) => {
    const now = drag.current;
    if (!now) return;
    const [x, y] = unitsAt(event);
    const dx = x - now.from[0];
    const dy = y - now.from[1];
    onChange(
      shapes.map((shape, i) => {
        const place = now.places.get(i);
        return place
          ? setPlace([place[0] + dx, place[1] + dy, place[2], place[3]])(shape)
          : shape;
      })
    );
  };

  const place = chosen.length > 0 ? placeOf(shapes[chosen[0]]) : null;
  const fill = shared(chosen.map((i) => shapes[i].fill));
  const stroke = shared(chosen.map((i) => shapes[i].stroke));
  const strokeWidth = chosen
    .map((i) => shapes[i].strokeWidth)
    .find((width) => width !== undefined);

  return (
    <>
      <Field label="Add a shape">
        <LibraryGrid>
          {ORNAMENT_LIBRARY.map((item) => (
            <LibraryButton
              key={item.name}
              onClick={() => {
                const made = placed(item, colors, [11, 11]);
                onChange([...shapes, ...made]);
                onPick(made.map((_, j) => shapes.length + j));
              }}
            >
              <svg viewBox="-7 -7 14 14" aria-hidden="true">
                {placed(item, colors, [0, 0]).map((shape, i) => (
                  <OrnamentShapeView key={i} shape={shape} colors={colors} />
                ))}
              </svg>
              {item.name}
            </LibraryButton>
          ))}
        </LibraryGrid>
      </Field>

      <Row style={{ alignItems: "flex-start", marginBottom: 12, gap: 16 }}>
        <Board
          ref={board}
          viewBox="0 0 24 24"
          aria-label="The ornament on the top left corner: drag a shape to move it"
          onPointerDown={() => onPick([])}
          onPointerMove={moveDrag}
          onPointerUp={() => (drag.current = null)}
          onPointerCancel={() => (drag.current = null)}
        >
          {[4, 8, 12, 16, 20].map((at) => (
            <g key={at} stroke="rgba(255,255,255,0.08)" strokeWidth={0.06}>
              <line x1={at} y1={0} x2={at} y2={24} />
              <line x1={0} y1={at} x2={24} y2={at} />
            </g>
          ))}
          <path
            d={`M${CARD_EDGE} 24V${
              CARD_EDGE + CARD_ROUND
            }a${CARD_ROUND} ${CARD_ROUND} 0 0 1 ${CARD_ROUND} -${CARD_ROUND}H24`}
            fill="none"
            stroke="rgba(255,255,255,0.35)"
            strokeWidth={0.15}
            strokeDasharray="0.6 0.4"
          />
          {shapes.map((shape, i) => (
            <g
              key={i}
              data-shape={i}
              onPointerDown={(event) => startDrag(event, i)}
            >
              <OrnamentShapeView shape={shape} colors={colors} />
              {/* A wide clear outline, so a thin line is easy to catch. */}
              <OrnamentShapeView
                shape={{
                  ...shape,
                  fill: colors.length,
                  stroke: colors.length,
                  strokeWidth: 1.6 / placeOf(shape)[3],
                }}
                colors={[...colors, "transparent"]}
              />
            </g>
          ))}
          {chosen.map((i) => (
            <g key={`picked-${i}`} pointerEvents="none">
              <OrnamentShapeView
                shape={{
                  ...shapes[i],
                  fill: undefined,
                  stroke: colors.length,
                  strokeWidth: 0.35 / placeOf(shapes[i])[3],
                }}
                colors={[...colors, PICKED]}
              />
            </g>
          ))}
        </Board>

        <div style={{ flex: 1, minWidth: 200 }}>
          {chosen.length === 0 || !place ? (
            <Hint>
              Pick a shape above to add it, then drag it into place. Click one
              to pick it, Shift-click to pick more and move them together. The
              dashed line is the card&apos;s corner; the other corners get it
              turned.
            </Hint>
          ) : (
            <>
              <Row style={{ marginBottom: 8 }}>
                <strong>
                  {chosen.length === 1
                    ? `Shape ${chosen[0] + 1}`
                    : `${chosen.length} shapes`}
                </strong>
                <span style={{ flex: 1 }} />
                <IconButton
                  aria-label="Copy the picked shapes"
                  title="Copy"
                  onClick={() => {
                    const copies = chosen.map((i) => {
                      const [x, y, turn, size] = placeOf(shapes[i]);
                      return {
                        ...structuredClone(shapes[i]),
                        at: [tidy(x + 2), tidy(y + 2), turn, size] as Place,
                      };
                    });
                    onChange([...shapes, ...copies]);
                    onPick(copies.map((_, j) => shapes.length + j));
                  }}
                >
                  ⧉ Copy
                </IconButton>
                <IconButton
                  aria-label="Bring the picked shapes to the front"
                  title="To the front"
                  onClick={() => {
                    const rest = shapes.filter((_, i) => !chosen.includes(i));
                    const front = chosen.map((i) => shapes[i]);
                    onChange([...rest, ...front]);
                    onPick(front.map((_, j) => rest.length + j));
                  }}
                >
                  ⬆ Front
                </IconButton>
                <IconButton
                  $variant="danger"
                  aria-label="Remove the picked shapes"
                  onClick={() => {
                    onChange(shapes.filter((_, i) => !chosen.includes(i)));
                    onPick([]);
                  }}
                >
                  ✕ Remove
                </IconButton>
              </Row>
              <Field label={`Size: ${Math.round(place[3] * 100)}%`}>
                <Slider
                  name="ornament-size"
                  min={0.2}
                  max={3}
                  step={0.05}
                  value={place[3]}
                  onChange={(event) => {
                    const size = Number(event.target.value);
                    changePicked((shape) => {
                      const [x, y, turn] = placeOf(shape);
                      return setPlace([x, y, turn, size])(shape);
                    });
                  }}
                />
              </Field>
              <Field label={`Turn: ${place[2]}°`}>
                <Slider
                  name="ornament-turn"
                  min={-180}
                  max={180}
                  step={5}
                  value={place[2]}
                  onChange={(event) => {
                    const turn = Number(event.target.value);
                    changePicked((shape) => {
                      const [x, y, , size] = placeOf(shape);
                      return setPlace([x, y, turn, size])(shape);
                    });
                  }}
                />
              </Field>
              <PaintPick
                label="Fill"
                value={fill}
                colors={colors}
                onChange={(next) =>
                  changePicked((shape) => ({ ...shape, fill: next }))
                }
              />
              <PaintPick
                label="Outline"
                value={stroke}
                colors={colors}
                onChange={(next) =>
                  changePicked((shape) => ({
                    ...shape,
                    stroke: next,
                    strokeWidth:
                      next === undefined
                        ? undefined
                        : shape.strokeWidth ?? strokeWidth ?? 1.2,
                  }))
                }
              />
              {stroke !== undefined && (
                <Field
                  label={`Outline width: ${strokeWidth ?? 1.2}`}
                  hint="It grows and shrinks with the size, as the shape does."
                >
                  <Slider
                    name="ornament-stroke-width"
                    min={0.2}
                    max={4}
                    step={0.1}
                    value={strokeWidth ?? 1.2}
                    onChange={(event) => {
                      const width = Number(event.target.value);
                      changePicked((shape) =>
                        shape.stroke === undefined
                          ? shape
                          : { ...shape, strokeWidth: width }
                      );
                    }}
                  />
                </Field>
              )}
              <Hint>Drag on the left to move; arrows nudge below.</Hint>
              <Row style={{ marginTop: 6 }}>
                {(
                  [
                    ["←", -0.5, 0],
                    ["→", 0.5, 0],
                    ["↑", 0, -0.5],
                    ["↓", 0, 0.5],
                  ] as const
                ).map(([label, dx, dy]) => (
                  <Button
                    key={label}
                    aria-label={`Nudge ${label}`}
                    onClick={() =>
                      changePicked((shape) => {
                        const [x, y, turn, size] = placeOf(shape);
                        return setPlace([x + dx, y + dy, turn, size])(shape);
                      })
                    }
                  >
                    {label}
                  </Button>
                ))}
              </Row>
            </>
          )}
        </div>
      </Row>
    </>
  );
}
