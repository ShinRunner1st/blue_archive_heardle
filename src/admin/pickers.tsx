/**
 * The admin tool's pickers for what the content names: an icon from
 * icons.ts, a picture on the Worker, a colour as #rrggbb.
 */
import React from "react";
import styled from "styled-components";

import { ICONS, iconNamed } from "../constants/icons";
import { pictureFiles } from "../constants/pictureFiles";
import { pictureUrl } from "../helpers/season";
import { Button, Input, Row } from "./ui";

const Grid = styled.div<{ $cell: number }>`
  display: grid;
  grid-template-columns: repeat(
    auto-fill,
    minmax(${({ $cell }) => $cell}px, 1fr)
  );
  gap: 4px;
  margin: 6px 0 10px;
`;

const Choice = styled.button.attrs({ type: "button" })<{ $active: boolean }>`
  display: grid;
  place-items: center;
  min-height: 40px;
  padding: 0;
  font: inherit;
  font-size: 20px;
  color: inherit;
  border-radius: 6px;
  overflow: hidden;
  border: 2px solid
    ${({ $active, theme }) =>
      $active ? theme.border : "rgba(255, 255, 255, 0.12)"};
  background: ${({ $active, theme }) =>
    $active ? theme.blue : "rgba(255, 255, 255, 0.05)"};
  cursor: pointer;

  img {
    display: block;
    width: 100%;
    aspect-ratio: 16 / 9;
    object-fit: cover;
  }

  small {
    display: block;
    width: 100%;
    padding: 2px 4px;
    font-size: 11px;
    text-align: left;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;

const Shown = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 18px;

  small {
    font-size: 12px;
    opacity: 0.6;
  }
`;

/** An icon by its name in icons.ts, from a grid that opens on demand. */
export function IconPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (name: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const Icon = iconNamed(value);
  return (
    <>
      <Row>
        <Shown>
          <Icon aria-hidden="true" />
          <small>{value}</small>
        </Shown>
        <Button onClick={() => setOpen(!open)}>
          {open ? "Done" : "Change icon"}
        </Button>
      </Row>
      {open && (
        <Grid $cell={40} role="radiogroup" aria-label="Icon">
          {Object.entries(ICONS).map(([name, Choice_]) => (
            <Choice
              key={name}
              role="radio"
              aria-checked={name === value}
              aria-label={name}
              title={name}
              $active={name === value}
              onClick={() => onChange(name)}
            >
              <Choice_ aria-hidden="true" />
            </Choice>
          ))}
        </Grid>
      )}
    </>
  );
}

/**
 * The pictures a card or banner can show: scenes on the Worker, not the
 * games' sheets or the students' pictures.
 */
export const SCENE_PICTURES = Object.keys(pictureFiles)
  .filter((key) => !/^(guess|students|voices|portraits)\//.test(key))
  .sort();

/** A picture on the Worker, from thumbnails. */
export function PicturePicker({
  value,
  onChange,
}: {
  value: string | undefined;
  onChange: (key: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Row>
        {value && pictureFiles[value] ? (
          <img
            src={pictureUrl(value)}
            alt=""
            width={96}
            height={54}
            style={{ objectFit: "cover", borderRadius: 4 }}
          />
        ) : null}
        <small>{value ?? "No picture"}</small>
        <Button onClick={() => setOpen(!open)}>
          {open ? "Done" : "Change picture"}
        </Button>
      </Row>
      {open && (
        <Grid $cell={120} role="radiogroup" aria-label="Picture">
          {SCENE_PICTURES.map((key) => (
            <Choice
              key={key}
              role="radio"
              aria-checked={key === value}
              title={key}
              $active={key === value}
              onClick={() => onChange(key)}
            >
              <img src={pictureUrl(key)} alt="" loading="lazy" />
              <small>{key}</small>
            </Choice>
          ))}
        </Grid>
      )}
    </>
  );
}

const Swatch = styled.input`
  width: 42px;
  height: 34px;
  padding: 0;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  background: none;
  cursor: pointer;
`;

const HEX = /^#[0-9a-fA-F]{6}$/;

/** A colour as #rrggbb: the browser's picker, or typed. */
export function ColorField({
  value,
  onChange,
  name,
}: {
  value: string;
  onChange: (color: string) => void;
  name: string;
}) {
  // The typed text, kept while it isn't a whole colour yet.
  const [text, setText] = React.useState(value);
  React.useEffect(() => setText(value), [value]);
  return (
    <Row style={{ flexWrap: "nowrap" }}>
      <Swatch
        type="color"
        name={`${name}-picker`}
        value={HEX.test(value) ? value : "#000000"}
        onChange={(event) => onChange(event.target.value.toUpperCase())}
      />
      <Input
        name={name}
        value={text}
        maxLength={7}
        spellCheck={false}
        style={{ width: 110, fontFamily: "monospace" }}
        onChange={(event) => {
          const next = event.target.value.trim();
          setText(next);
          if (HEX.test(next)) onChange(next.toUpperCase());
        }}
      />
    </Row>
  );
}
