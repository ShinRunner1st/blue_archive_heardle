/**
 * What moves on a cosmetic, edited: things drifting over a banner, a
 * frame or a background, and a name effect's colours, glow and motion.
 * The preview beside the form is the game's own, moving as players see it.
 */
import {
  type Drift,
  DRIFT_SHAPES,
  DRIFT_WAYS,
  type DriftShape,
  type DriftWay,
  type FrameColor,
  MAX_DRIFT,
  NAME_MOTIONS,
  type NameEffect,
  type NameMotion,
} from "../constants/cosmetics";
import { ColorPick, Fields, NumberField } from "./FrameEditor";
import { ColorList } from "./pickers";
import {
  Button,
  Check,
  Field,
  Heading,
  Hint,
  IconButton,
  Row,
  Select,
} from "./ui";

const SHAPE_NAMES: Record<DriftShape, string> = {
  petal: "Petals",
  snow: "Snow",
  spark: "Sparks",
  star: "Stars",
  leaf: "Leaves",
  bubble: "Bubbles",
};

const WAY_NAMES: Record<DriftWay, string> = {
  fall: "Falling",
  rise: "Rising",
  twinkle: "Twinkling where they are",
};

/** A start for each shape: how such things usually move. */
const SHAPE_START: Record<DriftShape, Omit<Drift, "shape" | "colors">> = {
  petal: { way: "fall", count: 8, seconds: 8, size: 6 },
  snow: { way: "fall", count: 12, seconds: 10, size: 4 },
  spark: { way: "rise", count: 8, seconds: 5, size: 3 },
  star: { way: "twinkle", count: 8, seconds: 2.6, size: 6 },
  leaf: { way: "fall", count: 6, seconds: 9, size: 7 },
  bubble: { way: "rise", count: 8, seconds: 8, size: 7 },
};

/**
 * Things drifting over a cosmetic, or none. A frame names its colours by
 * place in its palette (`palette`); a banner or background as hex.
 */
export function DriftFields<C extends string | FrameColor>({
  drift,
  palette,
  hint,
  onChange,
}: {
  drift: Drift<C> | undefined;
  palette?: string[];
  hint: string;
  onChange: (drift: Drift<C> | undefined) => void;
}) {
  const set = (patch: Partial<Drift<C>>) =>
    drift && onChange({ ...drift, ...patch });
  const firstColor = (palette ? 0 : "#FFFFFF") as C;
  return (
    <>
      <Heading as="h3">Drifting</Heading>
      <Check>
        <input
          type="checkbox"
          name="drift"
          checked={!!drift}
          onChange={(event) =>
            onChange(
              event.target.checked
                ? { shape: "petal", ...SHAPE_START.petal, colors: [firstColor] }
                : undefined
            )
          }
        />
        {hint}
      </Check>
      {drift && (
        <>
          <Fields>
            <Field label="What">
              <Select
                name="drift-shape"
                value={drift.shape}
                style={{ width: "auto" }}
                onChange={(event) => {
                  const shape = event.target.value as DriftShape;
                  set({ shape, ...SHAPE_START[shape] });
                }}
              >
                {DRIFT_SHAPES.map((shape) => (
                  <option key={shape} value={shape}>
                    {SHAPE_NAMES[shape]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="How">
              <Select
                name="drift-way"
                value={drift.way}
                style={{ width: "auto" }}
                onChange={(event) =>
                  set({ way: event.target.value as DriftWay })
                }
              >
                {DRIFT_WAYS.map((way) => (
                  <option key={way} value={way}>
                    {WAY_NAMES[way]}
                  </option>
                ))}
              </Select>
            </Field>
          </Fields>
          <Fields>
            <NumberField
              label={`How many, 1-${MAX_DRIFT}`}
              name="drift-count"
              value={drift.count}
              onChange={(count) =>
                set({
                  count: Math.max(1, Math.min(MAX_DRIFT, Math.round(count))),
                })
              }
            />
            <NumberField
              label={drift.way === "twinkle" ? "A twinkle, s" : "Crossing, s"}
              name="drift-seconds"
              value={drift.seconds}
              step={0.5}
              onChange={(seconds) => set({ seconds })}
            />
            <NumberField
              label="Size, px"
              name="drift-size"
              value={drift.size}
              onChange={(size) => set({ size })}
            />
          </Fields>
          {palette ? (
            <>
              {(drift.colors as FrameColor[]).map((color, i) => (
                <Row key={i} style={{ alignItems: "flex-end" }}>
                  <ColorPick
                    label={`Colour ${i + 1}, in turn`}
                    value={color}
                    colors={palette}
                    onChange={(next) =>
                      set({
                        colors: drift.colors.map((old, j) =>
                          j === i ? next ?? 0 : old
                        ) as C[],
                      })
                    }
                  />
                  {drift.colors.length > 1 && (
                    <IconButton
                      style={{ marginBottom: 14 }}
                      aria-label={`Remove drift colour ${i + 1}`}
                      onClick={() =>
                        set({ colors: drift.colors.filter((_, j) => j !== i) })
                      }
                    >
                      ✕
                    </IconButton>
                  )}
                </Row>
              ))}
              <Button
                style={{ marginBottom: 12 }}
                onClick={() =>
                  set({
                    colors: [
                      ...drift.colors,
                      (drift.colors.length % palette.length) as C,
                    ],
                  })
                }
              >
                + Colour
              </Button>
            </>
          ) : (
            <ColorList
              colors={drift.colors as string[]}
              labels={(i) => `Colour ${i + 1}, in turn`}
              min={1}
              name="drift-color"
              onChange={(colors) => set({ colors: colors as C[] })}
            />
          )}
        </>
      )}
    </>
  );
}

const MOTION_NAMES: Record<NameMotion, string> = {
  flow: "Flow: the colours run across",
  shine: "Shine: a light sweeps over",
  pulse: "Pulse: the glow breathes",
  flicker: "Flicker: a neon sign's",
};

/**
 * A name effect: its palette, the letters' colours from it, a glow and a
 * motion. Every colour a part takes is a place in the palette, as a
 * frame's are.
 */
export function NameEffectFields({
  effect,
  onChange,
}: {
  effect: NameEffect;
  onChange: (patch: Partial<NameEffect>) => void;
}) {
  const { colors, fill, glow, motion } = effect;
  const used = new Set<FrameColor>([
    ...(fill ?? []),
    ...(glow ? [glow.color] : []),
    ...(motion?.color === undefined ? [] : [motion.color]),
  ]);
  return (
    <>
      <Heading as="h3">Palette</Heading>
      <Hint style={{ marginBottom: 8 }}>
        The parts below take their colours from here, by number. Try it on the
        day and night previews: the name sits on the card&apos;s own colour.
      </Hint>
      <ColorList
        colors={colors}
        labels={(i) => `Colour ${i + 1}${used.has(i) ? "" : " (unused)"}`}
        min={1}
        name="name-color"
        onChange={(next) => {
          // A colour taken away is taken from the parts too.
          const fits = (at: FrameColor) => at < next.length;
          onChange({
            colors: next,
            fill: fill?.filter(fits),
            glow: glow && (fits(glow.color) ? glow : { ...glow, color: 0 }),
            motion: motion && {
              ...motion,
              color:
                motion.color !== undefined && fits(motion.color)
                  ? motion.color
                  : undefined,
            },
          });
        }}
      />

      <Heading as="h3">Letters</Heading>
      <Check>
        <input
          type="checkbox"
          name="name-fill"
          checked={!!fill}
          onChange={(event) =>
            onChange({ fill: event.target.checked ? [0] : undefined })
          }
        />
        In the palette&apos;s colours (off: the page&apos;s own)
      </Check>
      {fill && (
        <>
          {fill.map((color, i) => (
            <Row key={i} style={{ alignItems: "flex-end" }}>
              <ColorPick
                label={
                  fill.length > 1
                    ? `Across, colour ${i + 1}`
                    : "Colour (more makes a gradient)"
                }
                value={color}
                colors={colors}
                onChange={(next) =>
                  onChange({
                    fill: fill.map((old, j) => (j === i ? next ?? 0 : old)),
                  })
                }
              />
              {fill.length > 1 && (
                <IconButton
                  style={{ marginBottom: 14 }}
                  aria-label={`Remove letter colour ${i + 1}`}
                  onClick={() =>
                    onChange({ fill: fill.filter((_, j) => j !== i) })
                  }
                >
                  ✕
                </IconButton>
              )}
            </Row>
          ))}
          <Row style={{ marginBottom: 12, alignItems: "flex-end" }}>
            <Button
              onClick={() =>
                onChange({ fill: [...fill, fill.length % colors.length] })
              }
            >
              + Colour
            </Button>
            {fill.length > 1 && motion?.kind !== "flow" && (
              <NumberField
                label="Angle: 90 across, 0 upwards"
                name="name-angle"
                value={effect.angle ?? 90}
                step={5}
                onChange={(angle) => onChange({ angle })}
              />
            )}
          </Row>
        </>
      )}

      <Heading as="h3">Glow</Heading>
      <Check>
        <input
          type="checkbox"
          name="name-glow"
          checked={!!glow}
          onChange={(event) =>
            onChange({
              glow: event.target.checked
                ? { color: 0, blur: 6, strength: 0.6 }
                : undefined,
            })
          }
        />
        A glow round the letters
      </Check>
      {glow && (
        <Fields>
          <NumberField
            label="Blur, px"
            name="name-glow-blur"
            value={glow.blur}
            onChange={(blur) => onChange({ glow: { ...glow, blur } })}
          />
          <NumberField
            label="Strength, 0-1"
            name="name-glow-strength"
            value={glow.strength}
            step={0.05}
            onChange={(strength) => onChange({ glow: { ...glow, strength } })}
          />
          <ColorPick
            label="Colour"
            value={glow.color}
            colors={colors}
            onChange={(color) =>
              onChange({ glow: { ...glow, color: color ?? 0 } })
            }
          />
        </Fields>
      )}

      <Heading as="h3">Motion</Heading>
      <Fields>
        <Field
          label="How it moves"
          hint="A flow needs two letter colours or more; a pulse or flicker, a glow."
        >
          <Select
            name="name-motion"
            value={motion?.kind ?? ""}
            onChange={(event) => {
              const kind = event.target.value as NameMotion | "";
              onChange({
                motion: kind
                  ? {
                      kind,
                      seconds: motion?.seconds ?? 4,
                      ...(kind === "shine" && motion?.color !== undefined
                        ? { color: motion.color }
                        : {}),
                    }
                  : undefined,
              });
            }}
          >
            <option value="">Still</option>
            {NAME_MOTIONS.map((kind) => (
              <option key={kind} value={kind}>
                {MOTION_NAMES[kind]}
              </option>
            ))}
          </Select>
        </Field>
        {motion && (
          <NumberField
            label="One round, s"
            name="name-motion-seconds"
            value={motion.seconds}
            step={0.5}
            onChange={(seconds) => onChange({ motion: { ...motion, seconds } })}
          />
        )}
      </Fields>
      {motion?.kind === "shine" && (
        <ColorPick
          label="The light"
          value={motion.color}
          colors={colors}
          none="White"
          onChange={(color) =>
            onChange({
              motion: {
                kind: motion.kind,
                seconds: motion.seconds,
                ...(color === undefined ? {} : { color }),
              },
            })
          }
        />
      )}
    </>
  );
}
