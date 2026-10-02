import React from "react";
import styled from "styled-components";

import { songs } from "../constants";
import type { BadgeEntry } from "../content/types";
import { fileUrl } from "./api";
import type { TabProps } from "./MissionsTab";
import { PictureMaker } from "./PictureMaker";
import { PreviewPane } from "./PreviewPane";
import {
  Badge,
  Button,
  Column,
  Empty,
  Field,
  Heading,
  Hint,
  IconButton,
  Input,
  Item,
  ItemButton,
  List,
  Problems,
  Row,
  TextArea,
} from "./ui";

const byTheme = new Map(songs.map((song) => [song.themeNo, song]));

const Chips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 12px;
`;

const Chip = styled.span<{ $bad: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 4px 2px 8px;
  border-radius: 999px;
  font-size: 12px;
  background: ${({ $bad }) =>
    $bad ? "rgba(255, 77, 77, 0.35)" : "rgba(255, 255, 255, 0.1)"};
`;

const Matches = styled.ul`
  list-style: none;
  margin: -6px 0 12px;
  padding: 4px;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.3);

  button {
    width: 100%;
    padding: 5px 8px;
    font: inherit;
    color: inherit;
    text-align: left;
    background: none;
    border: none;
    border-radius: 4px;
    cursor: pointer;

    &:hover {
      background: rgba(255, 255, 255, 0.1);
    }
  }
`;

const Cover = styled.img`
  width: 96px;
  height: 96px;
  border-radius: 8px;
  object-fit: cover;
  background: rgba(255, 255, 255, 0.06);
`;

/**
 * The OST albums, each a badge earned by guessing all its songs: the
 * album's number, title, cover and tracklist (the songs in the game).
 */
export function BadgesTab({
  draft,
  update,
  problems,
  state,
  onPictures,
  pictureVersion,
}: TabProps) {
  const badges = draft.badges;
  const [index, setIndex] = React.useState(0);
  const [query, setQuery] = React.useState("");
  const [paste, setPaste] = React.useState("");
  const [found, setFound] = React.useState(0);
  const album = badges[index] as BadgeEntry | undefined;
  const released = album ? state.releasedBadges.includes(album.number) : false;
  const list = album?.songs ? album.songs.split(" ") : [];

  const setBadges = (change: (list: BadgeEntry[]) => BadgeEntry[]) =>
    update((files) => ({ ...files, badges: change(files.badges) }));
  const edit = (patch: Partial<BadgeEntry>) =>
    setBadges((all) =>
      all.map((b, i) => (i === index ? { ...b, ...patch } : b))
    );
  const setSongs = (themes: string[]) =>
    edit({ songs: [...new Set(themes)].join(" ") });

  const words = query.trim().toLowerCase();
  const matches = words
    ? songs
        .filter(
          ({ themeNo, name, artist }) =>
            !list.includes(themeNo) &&
            (themeNo === words.replace(/^#/, "") ||
              name.toLowerCase().includes(words) ||
              artist.toLowerCase().includes(words))
        )
        .slice(0, 8)
    : [];

  const own = album
    ? problems
        .filter(
          ({ file, message }) =>
            file === "badges" && message.startsWith(`Vol.${album.number}`)
        )
        .map(({ message }) => message)
    : [];

  return (
    <>
      <Column aria-label="Albums">
        <Heading>
          Albums
          <Button
            onClick={() => {
              const number = Math.max(0, ...badges.map((b) => b.number)) + 1;
              setBadges((all) => [
                ...all,
                { number, title: "", cover: `vol${number}.webp`, songs: "" },
              ]);
              setIndex(badges.length);
            }}
          >
            + New album
          </Button>
        </Heading>
        <List>
          {badges.map((item, i) => (
            <Item key={i} $active={i === index}>
              <ItemButton onClick={() => setIndex(i)}>
                <strong>Vol.{item.number}</strong>
                <small>
                  {item.title || "(no title)"} ·{" "}
                  {item.songs ? item.songs.split(" ").length : 0} songs
                </small>
              </ItemButton>
              {!state.releasedBadges.includes(item.number) && (
                <Badge $tone="new">New</Badge>
              )}
            </Item>
          ))}
        </List>
      </Column>

      <Column aria-label="Album">
        {album ? (
          <>
            <Heading>Vol.{album.number}</Heading>
            <Problems messages={own} />
            <Field
              label="Number"
              hint={
                released
                  ? "Released: rooms and their presets pick albums by number, so it stays."
                  : "Its Vol. number. Rooms and presets will pick it by this."
              }
            >
              <Input
                name="badge-number"
                type="number"
                min={1}
                readOnly={released}
                value={album.number}
                onChange={(event) =>
                  edit({ number: Math.floor(Number(event.target.value)) })
                }
              />
            </Field>
            <Field label="Title" hint="The album's subtitle.">
              <Input
                name="badge-title"
                value={album.title}
                onChange={(event) => edit({ title: event.target.value })}
              />
            </Field>

            <Heading>Cover</Heading>
            <Row style={{ marginBottom: 10 }}>
              <Cover
                src={fileUrl(`src/image/badges/${album.cover}`, pictureVersion)}
                alt=""
              />
              <Hint>
                src/image/badges/{album.cover}: in the site&apos;s own files, a
                few KB, so no upload is needed.
              </Hint>
            </Row>
            <PictureMaker
              target={`src/image/badges/vol${album.number}.webp`}
              styles={["cover"]}
              makeLabel="Make the cover"
              onMade={(list_) => {
                onPictures(list_, `src/image/badges/vol${album.number}.webp`);
                edit({ cover: `vol${album.number}.webp` });
              }}
            />

            <Heading>Songs · {list.length}</Heading>
            <Hint style={{ marginBottom: 8 }}>
              Its tracklist&apos;s songs that are in the game, by theme number.
              A song can be on two albums.
            </Hint>
            <Chips>
              {list.map((theme) => (
                <Chip key={theme} $bad={!byTheme.has(theme)}>
                  #{theme} {byTheme.get(theme)?.name ?? "isn't a song"}
                  <IconButton
                    aria-label={`Take #${theme} off`}
                    onClick={() => setSongs(list.filter((t) => t !== theme))}
                  >
                    ✕
                  </IconButton>
                </Chip>
              ))}
            </Chips>
            <Field label="Add a song" hint="By name, artist or theme number.">
              <Input
                name="badge-song"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </Field>
            {matches.length > 0 && (
              <Matches>
                {matches.map((song) => (
                  <li key={song.themeNo}>
                    <button
                      type="button"
                      onClick={() => {
                        setSongs([...list, song.themeNo]);
                        setQuery("");
                      }}
                    >
                      #{song.themeNo} {song.name} · <small>{song.artist}</small>
                    </button>
                  </li>
                ))}
              </Matches>
            )}
            <Field
              label="Or paste theme numbers"
              hint="Separated by spaces or commas, as a tracklist gives them."
            >
              <TextArea
                name="badge-paste"
                value={paste}
                onChange={(event) => setPaste(event.target.value)}
              />
            </Field>
            <Button
              disabled={!paste.trim()}
              onClick={() => {
                setSongs([...list, ...(paste.match(/\d+/g) ?? [])]);
                setPaste("");
              }}
            >
              Add them
            </Button>

            {!released && (
              <>
                <Heading>Delete</Heading>
                <Button
                  $variant="danger"
                  onClick={() => {
                    if (!window.confirm(`Delete Vol.${album.number}?`)) return;
                    setBadges((all) => all.filter((_, i) => i !== index));
                    setIndex(0);
                  }}
                >
                  Delete this album
                </Button>
              </>
            )}
          </>
        ) : (
          <Empty>Add an album.</Empty>
        )}
      </Column>

      <PreviewPane
        view={{
          kind: "badges",
          badges,
          covers: Object.fromEntries(
            badges.map(({ cover }) => [
              cover,
              fileUrl(`src/image/badges/${cover}`, pictureVersion),
            ])
          ),
          selected: album?.number ?? 0,
          found,
        }}
        extra={
          album && (
            <label style={{ display: "block", marginBottom: 4 }}>
              Vol.{album.number} songs guessed {Math.min(found, list.length)} /{" "}
              {list.length}{" "}
              <input
                type="range"
                name="preview-found"
                min={0}
                max={list.length}
                value={Math.min(found, list.length)}
                onChange={(event) => setFound(Number(event.target.value))}
              />
            </label>
          )
        }
      />
    </>
  );
}
