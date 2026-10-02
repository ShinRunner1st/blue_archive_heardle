/**
 * The pictures behind the site's pages (page-pictures.json): the home
 * background, the streak places, the hub's cards and Multiplayer's room,
 * each picked from what's there or made in place, previewed behind the
 * game's own pages.
 */
import React from "react";
import styled from "styled-components";

import {
  type DayAndNight,
  HUB_CARDS,
  type HubCard,
  ROOM_CARDS,
  type RoomCard,
  type PagePicturesFile,
  type StreakPlaceEntry,
} from "../content/types";
import { deletePicture, fileUrl } from "./api";
import { slugOf } from "./draft";
import type { TabProps } from "./MissionsTab";
import { PictureMaker } from "./PictureMaker";
import { PicturePicker } from "./pickers";
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
  Problems,
  Row,
} from "./ui";

type Time = "day" | "night";
const TIMES: Time[] = ["day", "night"];

type Part =
  | { part: "home" }
  | { part: "place"; index: number }
  | { part: "hub" }
  | { part: "rooms" };

const ROOM_CARD_NAMES: Record<RoomCard, string> = {
  join: "Join a room",
  make: "Make a room",
};

const CARD_NAMES: Record<HubCard, string> = {
  ost: "OST",
  voice: "Voice",
  picture: "Picture",
  students: "Students",
  multiplayer: "Multiplayer",
};

/** A site background's file as the content names it, from its path. */
const BUNDLED_PREFIX = "src/image/";

const Thumbs = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 8px;
  max-height: 320px;
  overflow-y: auto;
  margin-bottom: 12px;
`;

const Thumb = styled.button.attrs({ type: "button" })<{ $active: boolean }>`
  display: grid;
  gap: 4px;
  padding: 4px;
  border-radius: 6px;
  border: 2px solid
    ${({ $active, theme }) => ($active ? theme.blue : "transparent")};
  background: rgba(255, 255, 255, 0.05);
  color: inherit;
  font: inherit;
  font-size: 11px;
  text-align: left;
  cursor: pointer;
  word-break: break-all;

  img {
    width: 100%;
    aspect-ratio: 1280 / 900;
    object-fit: cover;
    border-radius: 4px;
  }
`;

const Pair = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 12px;

  img {
    width: 100%;
    aspect-ratio: 1280 / 900;
    object-fit: cover;
    border-radius: 6px;
  }
`;

/** One of the site's own backgrounds, picked from thumbnails. */
function BundledPicker({
  value,
  files,
  version,
  onChange,
}: {
  value: string;
  files: string[];
  version: string;
  onChange: (file: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Row style={{ marginBottom: 8 }}>
        <small>{value || "No picture"}</small>
        <Button onClick={() => setOpen(!open)}>
          {open ? "Done" : "Pick another"}
        </Button>
      </Row>
      {open && (
        <Thumbs role="radiogroup" aria-label="Picture">
          {files.map((file) => (
            <Thumb
              key={file}
              role="radio"
              aria-checked={file === value}
              $active={file === value}
              onClick={() => onChange(file)}
            >
              <img
                src={fileUrl(BUNDLED_PREFIX + file, version)}
                alt=""
                loading="lazy"
              />
              {file}
            </Thumb>
          ))}
        </Thumbs>
      )}
    </>
  );
}

export function PagePicturesTab({
  draft,
  update,
  problems,
  state,
  onPictures,
  pictureVersion,
}: TabProps) {
  const pages = draft.pagePictures;
  const [picked, setPicked] = React.useState<Part>({ part: "home" });
  const [deleting, setDeleting] = React.useState("");
  const [error, setError] = React.useState("");

  const setPages = (change: (pages: PagePicturesFile) => PagePicturesFile) =>
    update((files) => ({ ...files, pagePictures: change(files.pagePictures) }));

  // The site's own backgrounds there are: on disk at load, and made since.
  const [madeHere, setMadeHere] = React.useState<string[]>([]);
  const bundledFiles = [
    ...new Set([
      ...state.existing
        .filter(
          (path) =>
            path.startsWith(BUNDLED_PREFIX) &&
            !path.startsWith(`${BUNDLED_PREFIX}badges/`) &&
            path.endsWith(".webp")
        )
        .map((path) => path.slice(BUNDLED_PREFIX.length)),
      ...madeHere,
    ]),
  ].sort();
  const usedBundled = new Set([
    pages.home.day,
    pages.home.night,
    ...pages.places.flatMap(({ day, night }) => [day, night]),
  ]);
  const unusedBundled = bundledFiles.filter(
    (file) => file.startsWith("backgrounds/") && !usedBundled.has(file)
  );

  const place =
    picked.part === "place" ? pages.places[picked.index] : undefined;

  /** A home's or place's pictures and name, edited alike. */
  const scene: (DayAndNight & { name: string }) | undefined =
    picked.part === "home" ? pages.home : place;
  const editScene = (patch: Partial<StreakPlaceEntry>) => {
    if (picked.part === "home") {
      setPages((all) => ({ ...all, home: { ...all.home, ...patch } }));
    } else if (place) {
      const next = { ...place, ...patch };
      // Kept in order of wins, so the tour only goes on.
      const places = pages.places
        .map((item) => (item === place ? next : item))
        .sort((a, b) => a.wins - b.wins);
      setPages((all) => ({ ...all, places }));
      setPicked({ part: "place", index: places.indexOf(next) });
    }
  };

  /**
   * Where a new picture for a home or place goes: a file named after it,
   * never the file it shows now, which another place may share (a new
   * place starts with the last one's). Remaking one it made writes over
   * its own.
   */
  const bundledTarget = (time: Time) =>
    `backgrounds/${slugOf(scene?.name || "place", 40)}-${time}.webp`;

  const ownProblems = problems
    .filter(({ file }) => file === "pagePictures")
    .map(({ message }) => message)
    .filter((message) =>
      picked.part === "home"
        ? message.startsWith("home")
        : picked.part === "place"
        ? !!place && message.startsWith(place.name)
        : picked.part === "hub"
        ? message.startsWith("the hub's")
        : message.startsWith("Multiplayer")
    );

  const remove = async (file: string) => {
    setDeleting(file);
    setError("");
    const result = await deletePicture(BUNDLED_PREFIX + file).catch(
      (reason: unknown) => ({ ok: false as const, error: String(reason) })
    );
    setDeleting("");
    if (!result.ok) setError(result.error);
    else setMadeHere((files) => files.filter((other) => other !== file));
  };

  const itemCount = (part: Part["part"]) =>
    problems.filter(
      ({ file, message }) =>
        file === "pagePictures" &&
        (part === "hub"
          ? message.startsWith("the hub's")
          : part === "rooms"
          ? message.startsWith("Multiplayer")
          : part === "home"
          ? message.startsWith("home")
          : false)
    ).length;

  return (
    <>
      <Column aria-label="Page pictures">
        <Heading>Behind the pages</Heading>
        <List>
          <Item $active={picked.part === "home"}>
            <ItemButton onClick={() => setPicked({ part: "home" })}>
              <strong>Home background</strong>
              <small>{pages.home.name}, when no streak place shows</small>
            </ItemButton>
            {itemCount("home") > 0 && <Badge $tone="retired">!</Badge>}
          </Item>
        </List>
        <Heading>
          Streak places
          <Button
            onClick={() => {
              const last = pages.places[pages.places.length - 1];
              const next: StreakPlaceEntry = {
                wins: (last?.wins ?? 0) + 10,
                name: `New place ${pages.places.length + 1}`,
                day: last?.day ?? pages.home.day,
                night: last?.night ?? pages.home.night,
              };
              setPages((all) => ({ ...all, places: [...all.places, next] }));
              setPicked({ part: "place", index: pages.places.length });
            }}
          >
            + New place
          </Button>
        </Heading>
        <List>
          {pages.places.map((item, i) => (
            <Item
              key={`${item.name}-${i}`}
              $active={picked.part === "place" && picked.index === i}
            >
              <ItemButton
                onClick={() => setPicked({ part: "place", index: i })}
              >
                <strong>{item.name || "(no name)"}</strong>
                <small>{item.wins} wins in a row</small>
              </ItemButton>
            </Item>
          ))}
        </List>
        <Heading>On the Worker</Heading>
        <List>
          <Item $active={picked.part === "hub"}>
            <ItemButton onClick={() => setPicked({ part: "hub" })}>
              <strong>Hub cards</strong>
              <small>The scene behind each game&apos;s card</small>
            </ItemButton>
            {itemCount("hub") > 0 && <Badge $tone="retired">!</Badge>}
          </Item>
          <Item $active={picked.part === "rooms"}>
            <ItemButton onClick={() => setPicked({ part: "rooms" })}>
              <strong>Multiplayer</strong>
              <small>Its background, Join a room and Make a room</small>
            </ItemButton>
            {itemCount("rooms") > 0 && <Badge $tone="retired">!</Badge>}
          </Item>
        </List>
      </Column>

      <Column aria-label="Edit">
        <Problems messages={ownProblems} />
        {error && <Note $tone="bad">{error}</Note>}

        {scene && (
          <>
            <Heading>
              {picked.part === "home" ? "Home background" : "Streak place"}
            </Heading>
            <Field
              label="Name"
              hint={
                picked.part === "home"
                  ? `After a lost streak: “Back to ${scene.name}.” A season can name its own.`
                  : `When it's reached: “📍 New place unlocked: ${scene.name}!”`
              }
            >
              <Input
                name="page-name"
                value={scene.name}
                onChange={(event) => editScene({ name: event.target.value })}
              />
            </Field>
            {place && (
              <Field
                label="Wins in a row"
                hint="The endless win streak (or daily streak) that reaches it; the places stay in this order."
              >
                <Input
                  name="page-wins"
                  type="number"
                  min={1}
                  value={place.wins}
                  style={{ width: 110 }}
                  onChange={(event) =>
                    editScene({ wins: Number(event.target.value) })
                  }
                />
              </Field>
            )}
            <Pair>
              {TIMES.map((time) => (
                <figure key={time} style={{ margin: 0 }}>
                  {bundledFiles.includes(scene[time]) ? (
                    <img
                      src={fileUrl(
                        BUNDLED_PREFIX + scene[time],
                        pictureVersion
                      )}
                      alt=""
                    />
                  ) : (
                    <Empty style={{ margin: 0 }}>Not made yet</Empty>
                  )}
                  <figcaption>
                    <Hint>By {time}</Hint>
                  </figcaption>
                </figure>
              ))}
            </Pair>
            {TIMES.map((time) => (
              <React.Fragment key={time}>
                <Heading>The {time} picture</Heading>
                <BundledPicker
                  value={scene[time]}
                  files={bundledFiles}
                  version={pictureVersion}
                  onChange={(file) => editScene({ [time]: file })}
                />
                <PictureMaker
                  target={BUNDLED_PREFIX + bundledTarget(time)}
                  styles={[time === "day" ? "backdrop-day" : "backdrop-night"]}
                  makeLabel={`Make the ${time} picture`}
                  onBefore={() => editScene({ [time]: bundledTarget(time) })}
                  onMade={(list) => {
                    const file = bundledTarget(time);
                    setMadeHere((files) => [...files, file]);
                    onPictures(list, BUNDLED_PREFIX + file);
                  }}
                />
              </React.Fragment>
            ))}
            <Hint style={{ marginBottom: 12 }}>
              These ship with the site (src/image/), as they&apos;re the first
              thing a page shows: they go live when the branch is merged, with
              no npm run songs. A remade picture gets a new address, so players
              fetch it once.
            </Hint>
            {place && (
              <>
                <Heading>Delete</Heading>
                <Button
                  $variant="danger"
                  onClick={() => {
                    if (!window.confirm(`Delete the place ${place.name}?`)) {
                      return;
                    }
                    setPages((all) => ({
                      ...all,
                      places: all.places.filter((item) => item !== place),
                    }));
                    setPicked({ part: "home" });
                  }}
                >
                  Delete this place
                </Button>
                <Hint>
                  A streak past it moves on to the next; its pictures stay, to
                  delete below.
                </Hint>
              </>
            )}
            {unusedBundled.length > 0 && (
              <>
                <Heading>Not used</Heading>
                <Hint style={{ marginBottom: 8 }}>
                  Every picture in src/image/backgrounds/ ships with the site,
                  used or not. Save first, then delete the ones nothing shows.
                </Hint>
                {unusedBundled.map((file) => (
                  <Row key={file} style={{ marginBottom: 6 }}>
                    <small style={{ flex: 1 }}>{file}</small>
                    <Button
                      $variant="danger"
                      disabled={deleting === file}
                      onClick={() => remove(file)}
                    >
                      {deleting === file ? "Deleting…" : "Delete"}
                    </Button>
                  </Row>
                ))}
              </>
            )}
          </>
        )}

        {picked.part === "hub" && (
          <>
            <Heading>Hub cards</Heading>
            <Hint style={{ marginBottom: 12 }}>
              The scene behind each card on the hub. On the Worker: run npm run
              songs before merging.
            </Hint>
            {HUB_CARDS.map((card) => (
              <React.Fragment key={card}>
                <Heading as="h3">{CARD_NAMES[card]}</Heading>
                <PicturePicker
                  value={pages.hub[card]}
                  onChange={(key) =>
                    setPages((all) => ({
                      ...all,
                      hub: { ...all.hub, [card]: key },
                    }))
                  }
                />
                <details style={{ margin: "8px 0 14px" }}>
                  <summary style={{ cursor: "pointer" }}>
                    Make a new {CARD_NAMES[card]} scene
                  </summary>
                  <PictureMaker
                    target={`pictures/hub/${card}.webp`}
                    styles={["card"]}
                    makeLabel="Make it (replaces this card's picture)"
                    onBefore={() =>
                      setPages((all) => ({
                        ...all,
                        hub: { ...all.hub, [card]: `hub/${card}` },
                      }))
                    }
                    onMade={onPictures}
                  />
                </details>
              </React.Fragment>
            ))}
          </>
        )}

        {picked.part === "rooms" && (
          <>
            <Heading>Multiplayer</Heading>
            <Hint style={{ marginBottom: 12 }}>
              The scenes on the two big cards before a room, and the background
              behind Multiplayer&apos;s pages, whatever the season or streak. On
              the Worker: run npm run songs before merging.
            </Hint>
            {ROOM_CARDS.map((card) => (
              <React.Fragment key={card}>
                <Heading as="h3">{ROOM_CARD_NAMES[card]}</Heading>
                <PicturePicker
                  value={pages.roomCards[card]}
                  onChange={(key) =>
                    setPages((all) => ({
                      ...all,
                      roomCards: { ...all.roomCards, [card]: key },
                    }))
                  }
                />
                <details style={{ margin: "8px 0 14px" }}>
                  <summary style={{ cursor: "pointer" }}>
                    Make a new {ROOM_CARD_NAMES[card]} scene
                  </summary>
                  <PictureMaker
                    target={`pictures/hub/room-${card}.webp`}
                    styles={["card"]}
                    makeLabel="Make it (replaces this card's own picture)"
                    onBefore={() =>
                      setPages((all) => ({
                        ...all,
                        roomCards: {
                          ...all.roomCards,
                          [card]: `hub/room-${card}`,
                        },
                      }))
                    }
                    onMade={onPictures}
                  />
                </details>
              </React.Fragment>
            ))}
            {TIMES.map((time) => (
              <React.Fragment key={time}>
                <Heading as="h3">Background by {time}</Heading>
                <PicturePicker
                  value={pages.rooms[time]}
                  onChange={(key) =>
                    setPages((all) => ({
                      ...all,
                      rooms: { ...all.rooms, [time]: key },
                    }))
                  }
                />
                <details style={{ margin: "8px 0 14px" }}>
                  <summary style={{ cursor: "pointer" }}>
                    Make a new {time} picture
                  </summary>
                  <PictureMaker
                    target={`pictures/multiplayer/backdrop-${time}.webp`}
                    styles={[
                      time === "day" ? "backdrop-day" : "backdrop-night",
                    ]}
                    makeLabel="Make it (replaces this picture)"
                    onBefore={() =>
                      setPages((all) => ({
                        ...all,
                        rooms: {
                          ...all.rooms,
                          [time]: `multiplayer/backdrop-${time}`,
                        },
                      }))
                    }
                    onMade={onPictures}
                  />
                </details>
              </React.Fragment>
            ))}
          </>
        )}
      </Column>

      <PreviewPane
        view={{
          kind: "page",
          part: picked.part,
          // The hub's cards are seen over the home background.
          day: fileUrl(
            BUNDLED_PREFIX + (scene ?? pages.home).day,
            pictureVersion
          ),
          night: fileUrl(
            BUNDLED_PREFIX + (scene ?? pages.home).night,
            pictureVersion
          ),
          name: scene?.name ?? "",
          wins: place?.wins,
          hub: pages.hub,
          rooms: pages.rooms,
          roomCards: pages.roomCards,
        }}
      />
    </>
  );
}
