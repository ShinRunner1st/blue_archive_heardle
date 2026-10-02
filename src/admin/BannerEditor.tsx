/**
 * A nameplate's parts, edited: its plate (a picture or a foil), the
 * game's pattern over it, its colours, a band behind the title, a tag, and
 * an emblem: an icon, shapes and pictures drawn on a board as a frame's
 * corner is, or a picture down its side.
 */
import styled from "styled-components";

import {
  type Banner,
  BANNER_PATTERNS,
  type BannerEmblem,
  type BannerPattern,
  type EmblemStyle,
} from "../constants/cosmetics";
import { pictureUrl } from "../helpers/season";
import { TAG_LENGTH } from "../content/validate";
import { ShapesEditor } from "./FrameEditor";
import { ORNAMENT_LIBRARY, placed } from "./ornamentLibrary";
import { EMBLEM_PICTURES } from "./OrnamentMaker";
import {
  ColorField,
  ColorList,
  IconPicker,
  PicturePicker,
  SCENE_PICTURES,
} from "./pickers";
import { Check, Field, Heading, Hint, Input, Select } from "./ui";

type Patch = Record<string, unknown>;

const PATTERN_NAMES: Record<BannerPattern, string> = {
  facets: "Facets: pale triangles, as most of the game's plates",
  grid: "A fine grid, as the game's default plate",
  lines: "Fine lines across",
};

const STYLE_NAMES: Record<EmblemStyle, string> = {
  ring: "In a ring at its head",
  crest: "A crest standing free at its head",
  side: "A picture down its left side, cut on a slant",
};

const Pictures = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(76px, 1fr));
  gap: 6px;
  margin-bottom: 12px;
`;

const PictureChoice = styled.button.attrs({ type: "button" })<{
  $active: boolean;
}>`
  display: grid;
  justify-items: center;
  gap: 2px;
  padding: 4px;
  font: inherit;
  font-size: 11px;
  color: inherit;
  border-radius: 8px;
  border: 2px solid
    ${({ $active }) => ($active ? "#4DC3FF" : "rgba(255, 255, 255, 0.12)")};
  background: rgba(255, 255, 255, 0.06);
  cursor: pointer;

  img {
    width: 56px;
    height: 56px;
    object-fit: contain;
  }
`;

/** The parts that make a plate's look, copied when starting from another. */
const LOOK = [
  "picture",
  "fill",
  "pattern",
  "band",
  "ink",
  "accent",
  "emblem",
] as const;

/** An emblem of a style, from the one there: what it can keep, it does. */
function restyled(emblem: BannerEmblem | undefined, style: EmblemStyle) {
  if (style === "side") {
    return { style, picture: emblem?.picture ?? EMBLEM_PICTURES[0] ?? "" };
  }
  if (emblem?.shapes) return { ...emblem, style, picture: undefined };
  return { style, icon: emblem?.icon ?? "IoStar" };
}

export function BannerFields({
  banner,
  others,
  onChange,
}: {
  banner: Banner;
  /** The banners to start from. */
  others: Banner[];
  onChange: (patch: Patch) => void;
}) {
  const { emblem } = banner;
  const setEmblem = (next: BannerEmblem | undefined) =>
    onChange({ emblem: next });
  const color = (key: "ink" | "accent", label: string, hint?: string) => (
    <Field label={label} hint={hint}>
      <ColorField
        name={`banner-${key}`}
        value={banner[key]}
        onChange={(next) => onChange({ [key]: next })}
      />
    </Field>
  );

  return (
    <>
      <Field
        label="Start from"
        hint="Copies another banner's look (not its name or tag), to change from there."
      >
        <Select
          name="banner-start"
          value=""
          onChange={(event) => {
            const from = others.find(({ id }) => id === event.target.value);
            if (!from) return;
            const copy = structuredClone(from);
            onChange(Object.fromEntries(LOOK.map((key) => [key, copy[key]])));
          }}
        >
          <option value="">Pick a banner…</option>
          {others
            .filter(({ id, blank }) => id !== banner.id && !blank)
            .map((other) => (
              <option key={other.id} value={other.id}>
                {other.name || other.id}
              </option>
            ))}
        </Select>
      </Field>

      <Heading as="h3">Plate</Heading>
      <Field label="Behind the title">
        <Select
          name="banner-look"
          value={banner.picture ? "picture" : "foil"}
          onChange={(event) =>
            event.target.value === "picture"
              ? onChange({
                  picture:
                    SCENE_PICTURES.find((key) => key.includes("banner-")) ??
                    SCENE_PICTURES[0],
                  band: banner.band ?? "#1B2A4A",
                  fill: undefined,
                })
              : onChange({
                  picture: undefined,
                  fill: banner.fill ?? ["#22305A", "#2E4A8C"],
                })
          }
        >
          <option value="picture">A picture</option>
          <option value="foil">A foil of colours</option>
        </Select>
      </Field>
      {banner.picture ? (
        <Field
          label="Picture"
          hint="A banner's picture (made 640×160 in Pictures) fits best."
        >
          <PicturePicker
            value={banner.picture}
            onChange={(key) => onChange({ picture: key })}
          />
        </Field>
      ) : (
        <ColorList
          name="banner-fill"
          colors={banner.fill ?? []}
          min={2}
          labels={(i) => `Foil colour ${i + 1}, left to right`}
          onChange={(fill) => onChange({ fill })}
        />
      )}
      <Field label="Pattern over it" hint="Drawn in the rim's colour.">
        <Select
          name="banner-pattern"
          value={banner.pattern ?? ""}
          onChange={(event) =>
            onChange({ pattern: event.target.value || undefined })
          }
        >
          <option value="">None</option>
          {BANNER_PATTERNS.map((pattern) => (
            <option key={pattern} value={pattern}>
              {PATTERN_NAMES[pattern]}
            </option>
          ))}
        </Select>
      </Field>
      {color("accent", "Rim", "Round the plate, its pattern and a ring.")}
      {color("ink", "Title")}
      <Check>
        <input
          type="checkbox"
          name="banner-band"
          checked={banner.band !== undefined}
          onChange={(event) =>
            onChange({ band: event.target.checked ? "#1B2A4A" : undefined })
          }
        />
        A soft band behind the title, so it reads over a picture
      </Check>
      {banner.band !== undefined && (
        <Field label="Band">
          <ColorField
            name="banner-band-color"
            value={banner.band}
            onChange={(band) => onChange({ band })}
          />
        </Field>
      )}
      <Field
        label="Tag"
        hint={`A few words in a pill at its foot, such as "30 days" (shown in capitals), up to ${TAG_LENGTH} letters. Others see it in rooms, so it's a good place to say what was done.`}
      >
        <Input
          name="banner-tag"
          value={banner.tag ?? ""}
          maxLength={TAG_LENGTH}
          placeholder="No tag"
          onChange={(event) =>
            onChange({ tag: event.target.value || undefined })
          }
        />
      </Field>

      <Heading as="h3">Emblem</Heading>
      <Field label="Emblem">
        <Select
          name="banner-emblem-style"
          value={emblem?.style ?? ""}
          onChange={(event) => {
            const style = event.target.value as EmblemStyle | "";
            setEmblem(style ? restyled(emblem, style) : undefined);
          }}
        >
          <option value="">None</option>
          {(Object.keys(STYLE_NAMES) as EmblemStyle[]).map((style) => (
            <option
              key={style}
              value={style}
              disabled={style === "side" && EMBLEM_PICTURES.length === 0}
            >
              {STYLE_NAMES[style]}
            </option>
          ))}
        </Select>
      </Field>
      {EMBLEM_PICTURES.length === 0 && (
        <Hint style={{ marginBottom: 8 }}>
          A picture emblem needs a picture: make one from a PNG or JPG in
          Pictures → Emblems.
        </Hint>
      )}
      {emblem?.style === "side" && (
        <Field
          label="Picture"
          hint="Shown down the plate's left, its middle and top kept: a face works well."
        >
          <Pictures role="radiogroup" aria-label="Emblem picture">
            {EMBLEM_PICTURES.map((key) => (
              <PictureChoice
                key={key}
                role="radio"
                aria-checked={emblem.picture === key}
                $active={emblem.picture === key}
                title={key}
                onClick={() => setEmblem({ ...emblem, picture: key })}
              >
                <img src={pictureUrl(key)} alt="" loading="lazy" />
                {key.split("/")[1]}
              </PictureChoice>
            ))}
          </Pictures>
        </Field>
      )}
      {emblem && emblem.style !== "side" && (
        <>
          <Field label="Drawn from">
            <Select
              name="banner-emblem-from"
              value={emblem.shapes ? "shapes" : "icon"}
              onChange={(event) => {
                if (event.target.value === "icon") {
                  setEmblem({ style: emblem.style, icon: "IoStar" });
                  return;
                }
                const colors = [banner.accent, banner.ink];
                setEmblem({
                  style: emblem.style,
                  colors,
                  shapes: placed(ORNAMENT_LIBRARY[0], colors, [12, 12]),
                });
              }}
            >
              <option value="icon">An icon</option>
              <option value="shapes">Shapes and pictures, drawn here</option>
            </Select>
          </Field>
          {emblem.shapes ? (
            <>
              <ColorList
                name="emblem-color"
                colors={emblem.colors ?? []}
                min={1}
                labels={(i) => `Emblem colour ${i + 1}`}
                onChange={(colors) => setEmblem({ ...emblem, colors })}
              />
              <ShapesEditor
                shapes={emblem.shapes}
                colors={emblem.colors ?? []}
                guide={{ kind: "emblem", ring: emblem.style === "ring" }}
                onChange={(shapes, colors) =>
                  setEmblem({
                    ...emblem,
                    shapes,
                    ...(colors && { colors }),
                  })
                }
              />
            </>
          ) : (
            <Field label="Icon">
              <IconPicker
                value={emblem.icon ?? "IoStar"}
                onChange={(icon) => setEmblem({ ...emblem, icon })}
              />
            </Field>
          )}
        </>
      )}
    </>
  );
}
