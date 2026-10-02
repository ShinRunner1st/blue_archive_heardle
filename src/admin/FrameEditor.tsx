/**
 * A frame's parts, edited: its palette, a border, a line inside it, glows,
 * and an ornament of SVG shapes and pictures on its corners, shared and
 * turned to each or a corner's own (made on a board, typed in, or pasted
 * from an SVG drawn elsewhere). Every colour a part takes is a place in
 * the palette, so a style is recoloured by its palette alone.
 */
import React from "react";
import styled from "styled-components";

import {
  type Frame,
  FRAME_CORNERS,
  type FrameColor,
  type FrameCorner,
  type FrameGlow,
  type FrameInnerLine,
  ORNAMENT_SHAPES,
  type OrnamentShape,
  type OrnamentShapeKind,
} from "../constants/cosmetics";
import { CORNER_TURN } from "../components/Profile/card.styled";
import { ORNAMENT_LIBRARY, placed } from "./ornamentLibrary";
import {
  EMBLEM_PICTURES,
  type MakerGuide,
  OrnamentMaker,
} from "./OrnamentMaker";
import { DriftFields } from "./MotionEditor";
import { ColorField } from "./pickers";
import { shapesFromSvg } from "./svgImport";
import {
  Button,
  Card,
  Check,
  Field,
  Heading,
  Hint,
  IconButton,
  Input,
  Note,
  Row,
  Select,
  TextArea,
} from "./ui";

type Patch = Partial<Frame>;

const CORNER_NAMES: Record<FrameCorner, string> = {
  tl: "Top left",
  tr: "Top right",
  br: "Bottom right",
  bl: "Bottom left",
};

const SHAPE_NAMES: Record<OrnamentShapeKind, string> = {
  path: "Path",
  circle: "Circle",
  ellipse: "Ellipse",
  picture: "Picture",
};

/** Every place in the palette a part names. */
function usedColors(frame: Frame): Set<FrameColor> {
  const used = new Set<FrameColor>(frame.border.colors);
  if (frame.inner) used.add(frame.inner.color);
  frame.glows?.forEach(({ color }) => used.add(color));
  frame.drift?.colors.forEach((color) => used.add(color));
  [
    ...(frame.ornament?.shapes ?? []),
    ...Object.values(frame.ornament?.own ?? {}).flat(),
  ].forEach(({ fill, stroke }) => {
    if (fill !== undefined) used.add(fill);
    if (stroke !== undefined) used.add(stroke);
  });
  return used;
}

/** Shapes with their colours moved, by `at`. */
export const recolored = (
  shapes: OrnamentShape[],
  at: (color?: FrameColor) => FrameColor | undefined
) =>
  shapes.map((shape) => ({
    ...shape,
    fill: at(shape.fill),
    stroke: at(shape.stroke),
  }));

/**
 * Shapes turned round the box's middle by `turn` degrees, as one ornament:
 * the shared ornament as it shows on a corner, to start that corner's own.
 */
export function turnedShapes(
  shapes: OrnamentShape[],
  turn: number
): OrnamentShape[] {
  const angle = (turn * Math.PI) / 180;
  const [cos, sin] = [Math.cos(angle), Math.sin(angle)];
  // Rounded, and never -0.
  const tidy = (value: number) => Math.round(value * 100) / 100 || 0;
  return shapes.map((shape) => {
    const [x, y, degrees, size] = [
      shape.at?.[0] ?? 0,
      shape.at?.[1] ?? 0,
      shape.at?.[2] ?? 0,
      shape.at?.[3] ?? 1,
    ];
    const [dx, dy] = [x - 12, y - 12];
    return {
      ...shape,
      at: [
        tidy(12 + dx * cos - dy * sin),
        tidy(12 + dx * sin + dy * cos),
        ((degrees + turn + 540) % 360) - 180,
        size,
      ],
    };
  });
}

/** The parts with a palette colour taken out, the ones after it moved up. */
export function withoutColor(frame: Frame, removed: FrameColor): Patch {
  const at = (color: FrameColor) => (color > removed ? color - 1 : color);
  const maybe = (color?: FrameColor) =>
    color === undefined ? undefined : at(color);
  return {
    colors: frame.colors.filter((_, i) => i !== removed),
    border: { ...frame.border, colors: frame.border.colors.map(at) },
    inner: frame.inner && { ...frame.inner, color: at(frame.inner.color) },
    glows: frame.glows?.map((glow) => ({ ...glow, color: at(glow.color) })),
    drift: frame.drift && {
      ...frame.drift,
      colors: frame.drift.colors.map(at),
    },
    ornament: frame.ornament && {
      ...frame.ornament,
      shapes: recolored(frame.ornament.shapes, maybe),
      ...(frame.ornament.own && {
        own: Object.fromEntries(
          Object.entries(frame.ornament.own).map(([corner, shapes]) => [
            corner,
            recolored(shapes, maybe),
          ])
        ),
      }),
    },
  };
}

const Swatches = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
`;

const SwatchButton = styled.button.attrs({ type: "button" })<{
  $color: string;
}>`
  width: 28px;
  height: 28px;
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
    outline: 2px solid ${({ theme }) => theme.blue};
  }
`;

/** One of the palette's colours, by its number, or none. */
export function ColorPick({
  label,
  value,
  colors,
  none,
  onChange,
}: {
  label: string;
  value: FrameColor | undefined;
  colors: string[];
  /** What no colour means here, when it's allowed. */
  none?: string;
  onChange: (color: FrameColor | undefined) => void;
}) {
  return (
    <Field label={label}>
      <Swatches role="group" aria-label={label}>
        {none && (
          <SwatchButton
            $color="transparent"
            aria-pressed={value === undefined}
            aria-label={none}
            title={none}
            onClick={() => onChange(undefined)}
          >
            ⌀
          </SwatchButton>
        )}
        {colors.map((color, i) => (
          <SwatchButton
            key={i}
            $color={color}
            aria-pressed={value === i}
            aria-label={`Colour ${i + 1}`}
            title={`Colour ${i + 1}`}
            onClick={() => onChange(i)}
          >
            {i + 1}
          </SwatchButton>
        ))}
      </Swatches>
    </Field>
  );
}

/** A number typed in, kept as text while it isn't one yet. */
export function NumberField({
  label,
  name,
  value,
  step = 1,
  onChange,
}: {
  label: string;
  name: string;
  value: number | undefined;
  step?: number;
  onChange: (value: number) => void;
}) {
  const [text, setText] = React.useState(String(value ?? ""));
  React.useEffect(() => {
    if (Number(text) !== value) setText(String(value ?? ""));
    // Only a new value from outside resets the text.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return (
    <Field label={label}>
      <Input
        name={name}
        type="number"
        step={step}
        value={text}
        style={{ width: 90 }}
        onChange={(event) => {
          setText(event.target.value);
          const next = Number(event.target.value);
          if (event.target.value.trim() !== "" && Number.isFinite(next)) {
            onChange(next);
          }
        }}
      />
    </Field>
  );
}

/** A part of the editor folded away, for when it's wanted. */
const Details = styled.details`
  margin-bottom: 12px;

  > summary {
    cursor: pointer;
    font-weight: 700;
    margin-bottom: 10px;
  }
`;

/** Fields side by side. */
export const Fields = styled(Row)`
  align-items: flex-start;
  gap: 12px;
`;

/* ---------- An SVG file ---------- */

/** The largest SVG file taken: an ornament is a few small shapes. */
const SVG_FILE_LIMIT = 200 * 1024;

const FileTile = styled.label`
  /* Holds its hidden input: placed by the page, it scrolled the whole tool. */
  position: relative;
  overflow: hidden;
  display: grid;
  place-items: center;
  align-content: center;
  gap: 2px;
  padding: 6px 2px 4px;
  border-radius: 8px;
  border: 1px dashed rgba(255, 255, 255, 0.35);
  font-size: 11px;
  font-weight: 700;
  text-align: center;
  cursor: pointer;

  &:hover,
  &:focus-within {
    background: rgba(255, 255, 255, 0.1);
  }

  span:first-child {
    font-size: 20px;
    line-height: 1;
  }

  input {
    position: absolute;
    width: 1px;
    height: 1px;
    opacity: 0;
  }
`;

/** A tile in the shape library that opens an .svg file and adds it. */
function SvgFileTile({
  onOpen,
  onProblem,
}: {
  onOpen: (text: string) => void;
  onProblem: (problem: string) => void;
}) {
  return (
    <FileTile>
      <span aria-hidden="true">⤒</span>
      <span>Your SVG file</span>
      <input
        type="file"
        name="frame-svg-file"
        accept=".svg,image/svg+xml"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (!file) return;
          if (file.size > SVG_FILE_LIMIT) {
            onProblem("That file is over 200 KB: too big for an ornament.");
            return;
          }
          file.text().then(onOpen, () => onProblem("Couldn't read that file."));
        }}
      />
    </FileTile>
  );
}

/* ---------- One shape ---------- */

function ShapeFields({
  shape,
  index,
  count,
  colors,
  onChange,
  onMove,
  onCopy,
  onRemove,
}: {
  shape: OrnamentShape;
  index: number;
  count: number;
  colors: string[];
  onChange: (shape: OrnamentShape) => void;
  onMove: (to: number) => void;
  onCopy: () => void;
  onRemove: () => void;
}) {
  const set = (patch: Partial<OrnamentShape>) =>
    onChange({ ...shape, ...patch });
  const num = (key: "cx" | "cy" | "r" | "rx" | "ry", label: string) => (
    <NumberField
      label={label}
      name={`shape-${index}-${key}`}
      value={shape[key] ?? 0}
      step={0.1}
      onChange={(value) => set({ [key]: value })}
    />
  );
  const at = [
    shape.at?.[0] ?? 0,
    shape.at?.[1] ?? 0,
    shape.at?.[2] ?? 0,
    shape.at?.[3] ?? 1,
  ];
  return (
    <Card>
      <Row style={{ marginBottom: 8 }}>
        <strong>Shape {index + 1}</strong>
        <Select
          name={`shape-${index}`}
          value={shape.shape}
          style={{ width: "auto" }}
          onChange={(event) => {
            const kind = event.target.value as OrnamentShapeKind;
            set(
              kind === "path"
                ? { shape: kind, d: shape.d ?? "M4 4h16" }
                : kind === "circle"
                ? { shape: kind, r: shape.r ?? 3, cx: shape.cx ?? 6 }
                : kind === "picture"
                ? {
                    shape: kind,
                    picture: EMBLEM_PICTURES[0],
                    r: shape.r ?? 6,
                    cx: shape.cx ?? 12,
                    cy: shape.cy ?? 12,
                    fill: undefined,
                    stroke: undefined,
                    strokeWidth: undefined,
                  }
                : {
                    shape: kind,
                    rx: shape.rx ?? 4,
                    ry: shape.ry ?? 2,
                    cx: shape.cx ?? 8,
                  }
            );
          }}
        >
          {ORNAMENT_SHAPES.map((kind) => (
            <option
              key={kind}
              value={kind}
              disabled={kind === "picture" && EMBLEM_PICTURES.length === 0}
            >
              {SHAPE_NAMES[kind]}
            </option>
          ))}
        </Select>
        <span style={{ flex: 1 }} />
        <IconButton
          aria-label={`Move shape ${index + 1} up`}
          disabled={index === 0}
          onClick={() => onMove(index - 1)}
        >
          ↑
        </IconButton>
        <IconButton
          aria-label={`Move shape ${index + 1} down`}
          disabled={index === count - 1}
          onClick={() => onMove(index + 1)}
        >
          ↓
        </IconButton>
        <IconButton aria-label={`Copy shape ${index + 1}`} onClick={onCopy}>
          ⧉
        </IconButton>
        <IconButton aria-label={`Remove shape ${index + 1}`} onClick={onRemove}>
          ✕
        </IconButton>
      </Row>
      {shape.shape === "picture" ? (
        <>
          <Field label="Picture" hint="Made in Pictures → Emblems.">
            <Select
              name={`shape-${index}-picture`}
              value={shape.picture ?? ""}
              onChange={(event) => set({ picture: event.target.value })}
            >
              {EMBLEM_PICTURES.map((key) => (
                <option key={key} value={key}>
                  {key}
                </option>
              ))}
            </Select>
          </Field>
          <Fields>
            {num("cx", "Centre x")}
            {num("cy", "Centre y")}
            {num("r", "Half its width")}
          </Fields>
        </>
      ) : shape.shape === "path" ? (
        <Field
          label="Path (d)"
          hint="SVG path commands in the 24×24 box, its top left the card's corner."
        >
          <Input
            name={`shape-${index}-d`}
            value={shape.d ?? ""}
            spellCheck={false}
            style={{ fontFamily: "monospace" }}
            onChange={(event) => set({ d: event.target.value })}
          />
        </Field>
      ) : (
        <Fields>
          {num("cx", "Centre x")}
          {num("cy", "Centre y")}
          {shape.shape === "circle" ? (
            num("r", "Radius")
          ) : (
            <>
              {num("rx", "Width (rx)")}
              {num("ry", "Height (ry)")}
            </>
          )}
        </Fields>
      )}
      {shape.shape !== "picture" && (
        <Fields>
          <ColorPick
            label="Fill"
            value={shape.fill}
            colors={colors}
            none="No fill"
            onChange={(fill) => set({ fill })}
          />
          <ColorPick
            label="Outline"
            value={shape.stroke}
            colors={colors}
            none="No outline"
            onChange={(stroke) =>
              set({
                stroke,
                strokeWidth:
                  stroke === undefined ? undefined : shape.strokeWidth ?? 1.5,
              })
            }
          />
          {shape.stroke !== undefined && (
            <NumberField
              label="Outline width"
              name={`shape-${index}-stroke-width`}
              value={shape.strokeWidth}
              step={0.1}
              onChange={(strokeWidth) => set({ strokeWidth })}
            />
          )}
        </Fields>
      )}
      <Check>
        <input
          type="checkbox"
          name={`shape-${index}-at`}
          checked={shape.at !== undefined}
          onChange={(event) =>
            set({ at: event.target.checked ? [0, 0, 0, 1] : undefined })
          }
        />
        Moved, turned and sized
      </Check>
      {shape.at && (
        <Fields>
          {(["x", "y", "degrees", "size"] as const).map((label, i) => (
            <NumberField
              key={label}
              label={
                i === 3
                  ? "Size, 1 as drawn"
                  : i === 2
                  ? "Turned, degrees"
                  : `Moved ${label}`
              }
              name={`shape-${index}-at-${i}`}
              value={at[i]}
              step={i === 3 ? 0.05 : i === 2 ? 5 : 0.5}
              onChange={(value) => {
                const next = [...at] as [number, number, number, number];
                next[i] = value;
                set({ at: next });
              }}
            />
          ))}
        </Fields>
      )}
    </Card>
  );
}

/* ---------- The frame ---------- */

export function FrameFields({
  frame,
  others,
  onChange,
}: {
  frame: Frame;
  /** The frames to start from. */
  others: Frame[];
  onChange: (patch: Patch) => void;
}) {
  const { colors, border, inner, glows = [], ornament } = frame;
  const used = usedColors(frame);
  // The ornament being drawn: the shared one, or a corner's.
  const [editing, setEditing] = React.useState<"shared" | FrameCorner>(
    "shared"
  );

  const setBorder = (patch: Partial<Frame["border"]>) =>
    onChange({ border: { ...border, ...patch } });
  const setInner = (patch: Partial<FrameInnerLine>) =>
    inner && onChange({ inner: { ...inner, ...patch } });
  const setGlow = (i: number, patch: Partial<FrameGlow>) =>
    onChange({
      glows: glows.map((glow, j) => (j === i ? { ...glow, ...patch } : glow)),
    });
  const gradient =
    border.gradient ?? (border.colors.length > 1 ? "linear" : "");

  return (
    <>
      <Field
        label="Start from"
        hint="Copies another frame's palette and parts into this one, to change from there."
      >
        <Select
          name="frame-start"
          value=""
          onChange={(event) => {
            const from = others.find(({ id }) => id === event.target.value);
            if (!from) return;
            const copy = structuredClone(from);
            onChange({
              colors: copy.colors,
              border: copy.border,
              inner: copy.inner,
              glows: copy.glows,
              pulse: copy.pulse,
              ornament: copy.ornament,
              drift: copy.drift,
            });
          }}
        >
          <option value="">Pick a frame…</option>
          {others
            .filter(({ id }) => id !== frame.id)
            .map((other) => (
              <option key={other.id} value={other.id}>
                {other.name || other.id}
              </option>
            ))}
        </Select>
      </Field>

      <Heading as="h3">Palette</Heading>
      <Hint style={{ marginBottom: 8 }}>
        Each part below takes its colours from here, by number.
      </Hint>
      {colors.map((color, i) => (
        <Field key={i} label={`Colour ${i + 1}`}>
          <Row style={{ flexWrap: "nowrap" }}>
            <ColorField
              name={`frame-color-${i}`}
              value={color}
              onChange={(next) =>
                onChange({ colors: colors.map((c, j) => (j === i ? next : c)) })
              }
            />
            <IconButton
              aria-label={`Remove colour ${i + 1}`}
              title={used.has(i) ? "A part still uses it" : undefined}
              disabled={colors.length <= 1 || used.has(i)}
              onClick={() => onChange(withoutColor(frame, i))}
            >
              ✕
            </IconButton>
          </Row>
        </Field>
      ))}
      <Button
        style={{ marginBottom: 12 }}
        onClick={() =>
          onChange({ colors: [...colors, colors[colors.length - 1]] })
        }
      >
        + Colour
      </Button>

      <Heading as="h3">Border</Heading>
      <Fields>
        <NumberField
          label="Width, px"
          name="border-width"
          value={border.width}
          step={0.5}
          onChange={(width) => setBorder({ width })}
        />
        {border.colors.length > 1 && (
          <>
            <Field label="Gradient">
              <Select
                name="border-gradient"
                value={gradient}
                style={{ width: "auto" }}
                onChange={(event) =>
                  setBorder({
                    gradient: event.target.value as "linear" | "conic",
                  })
                }
              >
                <option value="linear">Straight across</option>
                <option value="conic">Round the card</option>
              </Select>
            </Field>
            <NumberField
              label={gradient === "conic" ? "Starting at, degrees" : "Angle"}
              name="border-angle"
              value={border.angle ?? (gradient === "conic" ? 0 : 90)}
              step={5}
              onChange={(angle) => setBorder({ angle })}
            />
            <NumberField
              label="Turns once in, s (0: still)"
              name="border-spin"
              value={border.spin ?? 0}
              step={1}
              onChange={(spin) =>
                setBorder({ spin: spin > 0 ? spin : undefined })
              }
            />
          </>
        )}
      </Fields>
      {border.colors.map((color, i) => (
        <Row key={i} style={{ alignItems: "flex-end" }}>
          <ColorPick
            label={
              border.colors.length > 1
                ? `Gradient colour ${i + 1}`
                : "Colour (more makes a gradient)"
            }
            value={color}
            colors={colors}
            onChange={(next) =>
              setBorder({
                colors: border.colors.map((c, j) => (j === i ? next ?? 0 : c)),
              })
            }
          />
          {border.colors.length > 1 && (
            <IconButton
              style={{ marginBottom: 14 }}
              aria-label={`Remove gradient colour ${i + 1}`}
              onClick={() => {
                const next = border.colors.filter((_, j) => j !== i);
                setBorder({
                  colors: next,
                  gradient: next.length > 1 ? border.gradient : undefined,
                  angle: next.length > 1 ? border.angle : undefined,
                  spin: next.length > 1 ? border.spin : undefined,
                });
              }}
            >
              ✕
            </IconButton>
          )}
        </Row>
      ))}
      <Button
        style={{ marginBottom: 12 }}
        onClick={() =>
          setBorder({
            colors: [...border.colors, border.colors.length % colors.length],
            gradient: border.gradient ?? "linear",
            angle: border.angle ?? 120,
          })
        }
      >
        + Gradient colour
      </Button>

      <Heading as="h3">Line inside</Heading>
      <Check>
        <input
          type="checkbox"
          name="frame-inner"
          checked={!!inner}
          onChange={(event) =>
            onChange({
              inner: event.target.checked
                ? { gap: 4, width: 1, color: 0, strength: 0.6 }
                : undefined,
            })
          }
        />
        A thin line inside the border, the page&apos;s colour between
      </Check>
      {inner && (
        <Fields>
          <NumberField
            label="Gap, px"
            name="inner-gap"
            value={inner.gap}
            onChange={(gap) => setInner({ gap })}
          />
          <NumberField
            label="Width, px"
            name="inner-width"
            value={inner.width}
            step={0.5}
            onChange={(width) => setInner({ width })}
          />
          <NumberField
            label="Strength, 0-1"
            name="inner-strength"
            value={inner.strength}
            step={0.05}
            onChange={(strength) => setInner({ strength })}
          />
          <ColorPick
            label="Colour"
            value={inner.color}
            colors={colors}
            onChange={(color) => setInner({ color: color ?? 0 })}
          />
        </Fields>
      )}

      <Heading as="h3">Glows</Heading>
      <Hint style={{ marginBottom: 8 }}>
        Round the outside. No blur makes a hard ring as wide as its spread.
      </Hint>
      {glows.map((glow, i) => (
        <Card key={i}>
          <Row style={{ marginBottom: 8 }}>
            <strong>Glow {i + 1}</strong>
            <span style={{ flex: 1 }} />
            <IconButton
              aria-label={`Remove glow ${i + 1}`}
              onClick={() => {
                const next = glows.filter((_, j) => j !== i);
                // A pulse breathes the glows: none left, nothing to breathe.
                onChange({
                  glows: next.length > 0 ? next : undefined,
                  ...(next.length === 0 ? { pulse: undefined } : {}),
                });
              }}
            >
              ✕
            </IconButton>
          </Row>
          <Fields>
            <NumberField
              label="Blur, px"
              name={`glow-${i}-blur`}
              value={glow.blur}
              onChange={(blur) => setGlow(i, { blur })}
            />
            <NumberField
              label="Spread, px"
              name={`glow-${i}-spread`}
              value={glow.spread}
              onChange={(spread) => setGlow(i, { spread })}
            />
            <NumberField
              label="Strength, 0-1"
              name={`glow-${i}-strength`}
              value={glow.strength}
              step={0.05}
              onChange={(strength) => setGlow(i, { strength })}
            />
            <ColorPick
              label="Colour"
              value={glow.color}
              colors={colors}
              onChange={(color) => setGlow(i, { color: color ?? 0 })}
            />
          </Fields>
        </Card>
      ))}
      <Button
        style={{ marginBottom: 12 }}
        disabled={glows.length >= 4}
        onClick={() =>
          onChange({
            glows: [...glows, { blur: 12, spread: 0, color: 0, strength: 0.4 }],
          })
        }
      >
        + Glow
      </Button>
      {glows.length > 0 && (
        <>
          <Check>
            <input
              type="checkbox"
              name="frame-pulse"
              checked={!!frame.pulse}
              onChange={(event) =>
                onChange({
                  pulse: event.target.checked
                    ? { seconds: 3, low: 0.35 }
                    : undefined,
                })
              }
            />
            The glows breathe, growing and fading
          </Check>
          {frame.pulse && (
            <Fields>
              <NumberField
                label="One breath, s"
                name="pulse-seconds"
                value={frame.pulse.seconds}
                step={0.5}
                onChange={(seconds) =>
                  frame.pulse &&
                  onChange({ pulse: { ...frame.pulse, seconds } })
                }
              />
              <NumberField
                label="At their faintest, 0-1"
                name="pulse-low"
                value={frame.pulse.low}
                step={0.05}
                onChange={(low) =>
                  frame.pulse && onChange({ pulse: { ...frame.pulse, low } })
                }
              />
            </Fields>
          )}
        </>
      )}

      <DriftFields
        drift={frame.drift}
        palette={colors}
        hint="Things twinkling round the edge, or falling or rising down its sides"
        onChange={(drift) => onChange({ drift })}
      />

      <Heading as="h3">Ornament</Heading>
      <Check>
        <input
          type="checkbox"
          name="frame-ornament"
          checked={!!ornament}
          onChange={(event) => {
            setEditing("shared");
            onChange({
              ornament: event.target.checked
                ? {
                    corners: [...FRAME_CORNERS],
                    shapes: placed(ORNAMENT_LIBRARY[0], colors, [11, 11]),
                  }
                : undefined,
            });
          }}
        />
        Shapes and pictures on the corners
      </Check>
      {ornament && (
        <OrnamentFields
          ornament={ornament}
          colors={colors}
          editing={editing}
          onEditing={setEditing}
          onChange={onChange}
        />
      )}
    </>
  );
}

/** A frame's ornament: the shared one, turned to its corners, and each corner's own. */
function OrnamentFields({
  ornament,
  colors,
  editing,
  onEditing,
  onChange,
}: {
  ornament: NonNullable<Frame["ornament"]>;
  colors: string[];
  editing: "shared" | FrameCorner;
  onEditing: (editing: "shared" | FrameCorner) => void;
  onChange: (patch: Patch) => void;
}) {
  const own = ornament.own ?? {};
  const setOrnament = (next: NonNullable<Frame["ornament"]>) => {
    const { own: owned, ...rest } = next;
    onChange({
      ornament:
        owned && Object.keys(owned).length > 0 ? { ...rest, own: owned } : rest,
    });
  };
  const corner = editing === "shared" ? null : editing;
  const ownShapes = corner ? own[corner] : undefined;

  return (
    <>
      <Field
        label="Draw"
        hint="The shared ornament is drawn for the top left and turned to each corner it's on; a corner can have its own instead, drawn as it shows there."
      >
        <Row role="tablist" aria-label="Which ornament">
          {(["shared", ...FRAME_CORNERS] as const).map((which) => (
            <Button
              key={which}
              role="tab"
              aria-selected={editing === which}
              $variant={editing === which ? "primary" : undefined}
              onClick={() => onEditing(which)}
            >
              {which === "shared"
                ? "Shared"
                : `${CORNER_NAMES[which]}${own[which] ? " ★" : ""}`}
            </Button>
          ))}
        </Row>
      </Field>

      {corner === null ? (
        <>
          <Field label="On the corners">
            <Row>
              {FRAME_CORNERS.map((at) => (
                <Check key={at} style={{ marginBottom: 0 }}>
                  <input
                    type="checkbox"
                    name={`corner-${at}`}
                    disabled={!!own[at]}
                    checked={ornament.corners.includes(at)}
                    onChange={(event) =>
                      setOrnament({
                        ...ornament,
                        corners: FRAME_CORNERS.filter((c) =>
                          c === at
                            ? event.target.checked
                            : ornament.corners.includes(c)
                        ),
                      })
                    }
                  />
                  {CORNER_NAMES[at]}
                  {own[at] && " (its own)"}
                </Check>
              ))}
            </Row>
          </Field>
          <ShapesEditor
            key="shared"
            shapes={ornament.shapes}
            colors={colors}
            guide={{ kind: "corner", turn: 0 }}
            onChange={(shapes, palette) =>
              onChange({
                ...(palette && { colors: palette }),
                ornament: { ...ornament, shapes },
              })
            }
          />
        </>
      ) : ownShapes ? (
        <>
          <Row style={{ marginBottom: 12 }}>
            <Hint style={{ flex: 1 }}>
              The {CORNER_NAMES[corner].toLowerCase()} corner has its own
              ornament, drawn as it shows there.
            </Hint>
            <Button
              onClick={() => {
                const rest = Object.fromEntries(
                  Object.entries(own).filter(([at]) => at !== corner)
                );
                setOrnament({
                  ...ornament,
                  corners: FRAME_CORNERS.filter(
                    (c) => c === corner || ornament.corners.includes(c)
                  ),
                  own: rest,
                });
              }}
            >
              Use the shared one again
            </Button>
          </Row>
          <ShapesEditor
            key={corner}
            shapes={ownShapes}
            colors={colors}
            guide={{ kind: "corner", turn: CORNER_TURN[corner] }}
            onChange={(shapes, palette) =>
              onChange({
                ...(palette && { colors: palette }),
                ornament: { ...ornament, own: { ...own, [corner]: shapes } },
              })
            }
          />
        </>
      ) : (
        <Card>
          <Hint style={{ marginBottom: 8 }}>
            {ornament.corners.includes(corner)
              ? `The ${CORNER_NAMES[
                  corner
                ].toLowerCase()} corner shows the shared ornament, turned.`
              : `Nothing on the ${CORNER_NAMES[corner].toLowerCase()} corner.`}
          </Hint>
          <Button
            $variant="primary"
            onClick={() =>
              setOrnament({
                ...ornament,
                corners: ornament.corners.filter((c) => c !== corner),
                own: {
                  ...own,
                  [corner]: ornament.corners.includes(corner)
                    ? turnedShapes(ornament.shapes, CORNER_TURN[corner])
                    : placed(ORNAMENT_LIBRARY[0], colors, [11, 11]),
                },
              })
            }
          >
            Give it its own
          </Button>
        </Card>
      )}
    </>
  );
}

/**
 * Shapes and pictures, edited on the board, number by number, or pasted
 * from an SVG: a frame's ornament or a nameplate's emblem. An SVG's
 * colours join the palette, so `onChange` may bring a new one.
 */
export function ShapesEditor({
  shapes,
  colors,
  guide,
  onChange,
}: {
  shapes: OrnamentShape[];
  colors: string[];
  guide: MakerGuide;
  onChange: (shapes: OrnamentShape[], colors?: string[]) => void;
}) {
  const [pasted, setPasted] = React.useState("");
  const [pasteNotes, setPasteNotes] = React.useState<string[]>([]);
  // The shapes picked on the board, by place in the list.
  const [picked, setPicked] = React.useState<number[]>([]);
  const setShapes = (next: OrnamentShape[]) => onChange(next);

  /** An SVG's shapes added (or put in place of the rest), then picked. */
  const addSvg = (text: string, replace = false) => {
    const kept = replace ? [] : shapes;
    const made = shapesFromSvg(text, colors, { room: 40 - kept.length });
    setPasteNotes(made.notes);
    if (made.shapes.length === 0) return;
    onChange([...kept, ...made.shapes], made.colors);
    setPicked(made.shapes.map((_, i) => kept.length + i));
    setPasted("");
  };

  return (
    <>
      <OrnamentMaker
        shapes={shapes}
        guide={guide}
        colors={colors}
        picked={picked}
        onPick={setPicked}
        onChange={setShapes}
        extra={
          <SvgFileTile
            onOpen={(text) => addSvg(text)}
            onProblem={(problem) => setPasteNotes([problem])}
          />
        }
      />
      {pasteNotes.map((note) => (
        <Note key={note} $tone="warn">
          {note}
        </Note>
      ))}
      <Details>
        <summary>Exact numbers, shape by shape</summary>
        {shapes.map((shape, i) => (
          <ShapeFields
            key={i}
            shape={shape}
            index={i}
            count={shapes.length}
            colors={colors}
            onChange={(next) =>
              setShapes(shapes.map((s, j) => (j === i ? next : s)))
            }
            onMove={(to) => {
              const moved = [...shapes];
              const [moving] = moved.splice(i, 1);
              moved.splice(to, 0, moving);
              setShapes(moved);
            }}
            onCopy={() =>
              setShapes([
                ...shapes.slice(0, i + 1),
                structuredClone(shape),
                ...shapes.slice(i + 1),
              ])
            }
            onRemove={() => setShapes(shapes.filter((_, j) => j !== i))}
          />
        ))}
        <Row style={{ marginBottom: 12 }}>
          {ORNAMENT_SHAPES.filter((kind) => kind !== "picture").map((kind) => (
            <Button
              key={kind}
              onClick={() =>
                setShapes([
                  ...shapes,
                  kind === "path"
                    ? {
                        shape: kind,
                        d: "M4 4h16",
                        stroke: 0,
                        strokeWidth: 2,
                      }
                    : kind === "circle"
                    ? { shape: kind, cx: 6, cy: 6, r: 3, fill: 0 }
                    : { shape: kind, cx: 10, cy: 6, rx: 6, ry: 3, fill: 0 },
                ])
              }
            >
              + {SHAPE_NAMES[kind]}
            </Button>
          ))}
        </Row>
      </Details>
      <Details>
        <summary>Paste an SVG&apos;s code</summary>
        <Field
          label="SVG code"
          hint="From a drawing app's Copy as SVG, or an .svg file opened in Notepad. Any size: it's fitted to the box."
        >
          <TextArea
            name="frame-svg"
            data-own-undo
            value={pasted}
            spellCheck={false}
            placeholder='<svg viewBox="0 0 512 512">…</svg>'
            style={{ fontFamily: "monospace" }}
            onChange={(event) => setPasted(event.target.value)}
          />
        </Field>
        <Row style={{ marginBottom: 12 }}>
          <Button disabled={!pasted.trim()} onClick={() => addSvg(pasted)}>
            Add its shapes
          </Button>
          <Button
            disabled={!pasted.trim()}
            onClick={() => addSvg(pasted, true)}
          >
            Replace the shapes
          </Button>
        </Row>
      </Details>
    </>
  );
}
