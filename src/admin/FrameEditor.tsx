/**
 * A frame's parts, edited: its palette, a border, a line inside it, glows,
 * and an ornament of SVG shapes on its corners (typed in, or pasted from
 * an SVG drawn elsewhere). Every colour a part takes is a place in the
 * palette, so a style is recoloured by its palette alone.
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
import { ORNAMENT_LIBRARY, placed } from "./ornamentLibrary";
import { OrnamentMaker } from "./OrnamentMaker";
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
};

/** Every place in the palette a part names. */
function usedColors(frame: Frame): Set<FrameColor> {
  const used = new Set<FrameColor>(frame.border.colors);
  if (frame.inner) used.add(frame.inner.color);
  frame.glows?.forEach(({ color }) => used.add(color));
  frame.ornament?.shapes.forEach(({ fill, stroke }) => {
    if (fill !== undefined) used.add(fill);
    if (stroke !== undefined) used.add(stroke);
  });
  return used;
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
    ornament: frame.ornament && {
      ...frame.ornament,
      shapes: frame.ornament.shapes.map((shape) => ({
        ...shape,
        fill: maybe(shape.fill),
        stroke: maybe(shape.stroke),
      })),
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
function ColorPick({
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
function NumberField({
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
const Fields = styled(Row)`
  align-items: flex-start;
  gap: 12px;
`;

/* ---------- An SVG file ---------- */

/** The largest SVG file taken: an ornament is a few small shapes. */
const SVG_FILE_LIMIT = 200 * 1024;

const FileTile = styled.label`
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
            <option key={kind} value={kind}>
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
      {shape.shape === "path" ? (
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
  const [pasted, setPasted] = React.useState("");
  const [pasteNotes, setPasteNotes] = React.useState<string[]>([]);
  // The ornament's shapes picked on its board, by place in the list.
  const [picked, setPicked] = React.useState<number[]>([]);

  const setBorder = (patch: Partial<Frame["border"]>) =>
    onChange({ border: { ...border, ...patch } });
  const setInner = (patch: Partial<FrameInnerLine>) =>
    inner && onChange({ inner: { ...inner, ...patch } });
  const setGlow = (i: number, patch: Partial<FrameGlow>) =>
    onChange({
      glows: glows.map((glow, j) => (j === i ? { ...glow, ...patch } : glow)),
    });
  const setShapes = (shapes: OrnamentShape[]) =>
    ornament && onChange({ ornament: { ...ornament, shapes } });

  /** An SVG's shapes added (or put in place of the rest), then picked. */
  const addSvg = (text: string, replace = false) => {
    if (!ornament) return;
    const kept = replace ? [] : ornament.shapes;
    const made = shapesFromSvg(text, colors, { room: 40 - kept.length });
    setPasteNotes(made.notes);
    if (made.shapes.length === 0) return;
    onChange({
      colors: made.colors,
      ornament: { ...ornament, shapes: [...kept, ...made.shapes] },
    });
    setPicked(made.shapes.map((_, i) => kept.length + i));
    setPasted("");
  };
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
              ornament: copy.ornament,
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
                onChange({ glows: next.length > 0 ? next : undefined });
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

      <Heading as="h3">Ornament</Heading>
      <Check>
        <input
          type="checkbox"
          name="frame-ornament"
          checked={!!ornament}
          onChange={(event) =>
            onChange({
              ornament: event.target.checked
                ? {
                    corners: [...FRAME_CORNERS],
                    shapes: placed(ORNAMENT_LIBRARY[0], colors, [11, 11]),
                  }
                : undefined,
            })
          }
        />
        Shapes on the corners
      </Check>
      {ornament && (
        <>
          <Field label="On the corners">
            <Row>
              {FRAME_CORNERS.map((corner) => (
                <Check key={corner} style={{ marginBottom: 0 }}>
                  <input
                    type="checkbox"
                    name={`corner-${corner}`}
                    checked={ornament.corners.includes(corner)}
                    onChange={(event) =>
                      onChange({
                        ornament: {
                          ...ornament,
                          corners: FRAME_CORNERS.filter((c) =>
                            c === corner
                              ? event.target.checked
                              : ornament.corners.includes(c)
                          ),
                        },
                      })
                    }
                  />
                  {CORNER_NAMES[corner]}
                </Check>
              ))}
            </Row>
          </Field>
          <OrnamentMaker
            ornament={ornament}
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
            {ornament.shapes.map((shape, i) => (
              <ShapeFields
                key={i}
                shape={shape}
                index={i}
                count={ornament.shapes.length}
                colors={colors}
                onChange={(next) =>
                  setShapes(ornament.shapes.map((s, j) => (j === i ? next : s)))
                }
                onMove={(to) => {
                  const shapes = [...ornament.shapes];
                  const [moving] = shapes.splice(i, 1);
                  shapes.splice(to, 0, moving);
                  setShapes(shapes);
                }}
                onCopy={() =>
                  setShapes([
                    ...ornament.shapes.slice(0, i + 1),
                    structuredClone(shape),
                    ...ornament.shapes.slice(i + 1),
                  ])
                }
                onRemove={() =>
                  setShapes(ornament.shapes.filter((_, j) => j !== i))
                }
              />
            ))}
            <Row style={{ marginBottom: 12 }}>
              {ORNAMENT_SHAPES.map((kind) => (
                <Button
                  key={kind}
                  onClick={() =>
                    setShapes([
                      ...ornament.shapes,
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
              hint="From a drawing app's Copy as SVG, or an .svg file opened in Notepad. Any size: it's fitted to the corner."
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
      )}
    </>
  );
}
