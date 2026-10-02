import React from "react";
import styled from "styled-components";

import type { ContentFiles } from "../content/types";
import { deletePicture, fileUrl } from "./api";
import { slugOf } from "./draft";
import type { TabProps } from "./MissionsTab";
import { PictureMaker } from "./PictureMaker";
import type { PictureEntry } from "./pictureRules";
import { PreviewPane } from "./PreviewPane";
import {
  Badge,
  Button,
  Column,
  Empty,
  Field,
  Heading,
  Hint,
  Input,
  Item,
  ItemButton,
  List,
  Note,
} from "./ui";

/** The folders, and what each is for. */
const FOLDERS = [
  {
    id: "scenes",
    label: "Scenes",
    note: "Yours, made here, for banners and backgrounds",
  },
  { id: "seasons", label: "Seasons", note: "Made in the Seasons tab" },
  { id: "hub", label: "Hub cards", note: "Drawn by scripts/make-card.mjs" },
  { id: "multiplayer", label: "Multiplayer", note: "The rooms' backdrop" },
] as const;

const Thumb = styled.img`
  width: 64px;
  height: 36px;
  flex: none;
  object-fit: cover;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.06);
`;

const Big = styled.img`
  display: block;
  width: 100%;
  max-height: 300px;
  object-fit: contain;
  border-radius: 8px;
  margin-bottom: 12px;
  background: rgba(0, 0, 0, 0.3);
`;

/** Where the draft shows a picture, by its key. */
export function usesOf(files: ContentFiles, key: string): string[] {
  const uses: string[] = [];
  for (const season of files.seasons) {
    const name = season.pictures ?? season.id;
    if (key === `seasons/${name}-day` || key === `seasons/${name}-night`) {
      uses.push(`Season: ${season.id}`);
    }
  }
  for (const banner of files.cosmetics.banners) {
    if (banner.picture === key) uses.push(`Banner: ${banner.name}`);
  }
  for (const background of files.cosmetics.backgrounds) {
    if (background.picture === key) uses.push(`Background: ${background.name}`);
  }
  return uses;
}

/**
 * The pictures cards, banners and seasons can show: see them, make new
 * ones, replace or delete the tool's own. On this PC only until `npm run
 * songs` puts them on the Worker and R2.
 */
export function PicturesTab({
  draft,
  pictures,
  onPictures,
  pictureVersion,
}: TabProps) {
  const [folder, setFolder] = React.useState<string>("scenes");
  const [selected, setSelected] = React.useState<string | null>(null);
  const [name, setName] = React.useState("");
  const [error, setError] = React.useState("");
  const shown = pictures.filter(({ key }) => key.startsWith(`${folder}/`));
  const picture = pictures.find(({ key }) => key === selected);
  const own = folder === "scenes" || folder === "seasons";
  const url = (entry: PictureEntry) => fileUrl(entry.path, pictureVersion);
  const newPath = `pictures/scenes/${slugOf(name) || "new"}.webp`;
  const unlisted = pictures.filter(({ listed }) => !listed).length;

  return (
    <>
      <Column aria-label="Pictures">
        <Heading>Folders</Heading>
        <List>
          {FOLDERS.map(({ id, label, note }) => (
            <Item key={id} $active={id === folder}>
              <ItemButton
                onClick={() => {
                  setFolder(id);
                  setSelected(null);
                }}
              >
                <strong>
                  {label} ·{" "}
                  {
                    pictures.filter(({ key }) => key.startsWith(`${id}/`))
                      .length
                  }
                </strong>
                <small>{note}</small>
              </ItemButton>
            </Item>
          ))}
        </List>

        <Heading>
          In {folder}
          {folder === "scenes" && (
            <Button onClick={() => setSelected(null)}>+ New</Button>
          )}
        </Heading>
        <List>
          {shown.map((entry) => (
            <Item key={entry.key} $active={entry.key === selected}>
              <ItemButton
                onClick={() => setSelected(entry.key)}
                style={{ display: "flex", gap: 8, alignItems: "center" }}
              >
                <Thumb src={url(entry)} alt="" loading="lazy" />
                <span style={{ minWidth: 0 }}>
                  <strong>{entry.key.split("/")[1]}</strong>
                  <small>
                    {entry.kb} KB · {usesOf(draft, entry.key).length} uses
                  </small>
                </span>
              </ItemButton>
              {!entry.listed && <Badge $tone="new">Unlisted</Badge>}
            </Item>
          ))}
        </List>
        {shown.length === 0 && <Empty>None yet.</Empty>}
      </Column>

      <Column aria-label="Picture">
        <Note $tone="warn">
          Pictures made here are on this PC only: before merging, run{" "}
          <code>npm run songs</code> to put them on the Worker and R2 (R2 is the
          paid backup; each scene is about 70 KB).
          {unlisted > 0 && ` ${unlisted} picture(s) aren't listed yet.`}
        </Note>
        {error && <Note $tone="bad">{error}</Note>}
        {picture ? (
          <>
            <Heading>{picture.key}</Heading>
            <Big src={url(picture)} alt="" />
            <Hint style={{ marginBottom: 12 }}>
              {picture.kb} KB · {picture.path}
            </Hint>
            <Heading>Shown by</Heading>
            {usesOf(draft, picture.key).length > 0 ? (
              <Note>{usesOf(draft, picture.key).join(", ")}</Note>
            ) : (
              <Hint style={{ marginBottom: 12 }}>
                Nothing yet: pick it for a banner or background in Rewards.
              </Hint>
            )}
            {own ? (
              <>
                <Heading>Replace</Heading>
                <Hint style={{ marginBottom: 8 }}>
                  Players get the new picture once it&apos;s on the Worker; its
                  name there changes with it, so nobody keeps the old one.
                </Hint>
                <PictureMaker
                  target={picture.path}
                  styles={
                    folder === "seasons"
                      ? picture.key.endsWith("-night")
                        ? ["backdrop-night"]
                        : ["backdrop-day"]
                      : ["scene", "banner", "backdrop-day", "backdrop-night"]
                  }
                  makeLabel="Replace it"
                  onMade={onPictures}
                />
                <Heading>Delete</Heading>
                <Button
                  $variant="danger"
                  disabled={usesOf(draft, picture.key).length > 0}
                  onClick={async () => {
                    if (!window.confirm(`Delete ${picture.key}?`)) return;
                    const result = await deletePicture(picture.path);
                    if (result.ok) {
                      setSelected(null);
                      setError("");
                      onPictures(result.pictures);
                    } else setError(result.error);
                  }}
                >
                  Delete
                </Button>
                {usesOf(draft, picture.key).length > 0 && (
                  <Hint>Only a picture nothing shows can go.</Hint>
                )}
              </>
            ) : (
              <Hint>
                Made by the project&apos;s own scripts, so changed there, not
                here.
              </Hint>
            )}
          </>
        ) : folder === "scenes" ? (
          <>
            <Heading>New scene</Heading>
            <Field
              label="Name"
              hint="Small letters and hyphens: it's how rewards name it, scenes/<name>."
            >
              <Input
                name="picture-name"
                value={name}
                placeholder="rooftop-sunset"
                onChange={(event) => setName(event.target.value)}
              />
            </Field>
            {pictures.some(({ path }) => path === newPath) && (
              <Note $tone="warn">
                There&apos;s one by that name: making it replaces it.
              </Note>
            )}
            <PictureMaker
              target={newPath}
              styles={["scene", "banner", "backdrop-day", "backdrop-night"]}
              onMade={(list) => {
                onPictures(list);
                setSelected(`scenes/${slugOf(name) || "new"}`);
                setName("");
              }}
            />
          </>
        ) : (
          <Empty>Pick a picture.</Empty>
        )}
      </Column>

      <PreviewPane
        view={
          picture?.listed
            ? { kind: "picture", key: picture.key }
            : { kind: "picture", key: "" }
        }
      />
    </>
  );
}
