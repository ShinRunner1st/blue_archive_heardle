import React from "react";
import styled from "styled-components";

import type { MonthDay } from "../constants/seasons";
import type { SeasonEntry } from "../content/types";
import { fileUrl } from "./api";
import { freeId, replaced, slugOf } from "./draft";
import type { TabProps } from "./MissionsTab";
import { PictureMaker } from "./PictureMaker";
import { PreviewPane } from "./PreviewPane";
import {
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
  Problems,
  Row,
  Select,
} from "./ui";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** Days into a leap year, so 29 February has its place. */
const dayOfYear = ([month, day]: number[]) =>
  Math.round(
    (Date.UTC(2028, month - 1, day) - Date.UTC(2028, 0, 1)) / 86_400_000
  );

const when = ([month, day]: number[]) =>
  `${day} ${MONTHS[month - 1]?.slice(0, 3) ?? "?"}`;

/** A season's pictures' name: its own id, or the season it shares with. */
const pictureName = (season: SeasonEntry) => season.pictures ?? season.id;

const Year = styled.div`
  position: relative;
  height: 46px;
  margin-bottom: 14px;
  border-radius: 6px;
  background: repeating-linear-gradient(
    90deg,
    rgba(255, 255, 255, 0.06) 0 calc(100% / 12 - 1px),
    rgba(255, 255, 255, 0.18) calc(100% / 12 - 1px) calc(100% / 12)
  );
`;

const Bar = styled.button.attrs({ type: "button" })<{ $active: boolean }>`
  position: absolute;
  top: 6px;
  height: 22px;
  min-width: 4px;
  padding: 0;
  border: none;
  border-radius: 3px;
  background: ${({ $active, theme }) => ($active ? theme.orange : theme.blue)};
  cursor: pointer;
`;

const Months = styled.div`
  position: absolute;
  inset: auto 0 2px;
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  font-size: 10px;
  opacity: 0.6;
  text-align: center;
`;

const Pair = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 12px;

  img {
    display: block;
    width: 100%;
    aspect-ratio: 1280 / 900;
    object-fit: cover;
    border-radius: 6px;
    background: rgba(255, 255, 255, 0.06);
  }
`;

/** Every season on one strip of the year, wrapping round New Year. */
function YearStrip({
  seasons,
  selected,
  onPick,
}: {
  seasons: SeasonEntry[];
  selected: number;
  onPick: (index: number) => void;
}) {
  const parts = seasons.flatMap((season, index) => {
    const from = dayOfYear(season.from);
    const to = dayOfYear(season.to) + 1;
    if (Number.isNaN(from) || Number.isNaN(to)) return [];
    const spans =
      to > from
        ? [[from, to]]
        : [
            [from, 366],
            [0, to],
          ];
    return spans.map(([start, end]) => ({ index, season, start, end }));
  });
  return (
    <Year aria-label="The year">
      {parts.map(({ index, season, start, end }) => (
        <Bar
          key={`${index}-${start}`}
          $active={index === selected}
          title={`${season.id}: ${when(season.from)} – ${when(season.to)}`}
          style={{
            left: `${(start / 366) * 100}%`,
            width: `${((end - start) / 366) * 100}%`,
          }}
          onClick={() => onPick(index)}
        />
      ))}
      <Months aria-hidden="true">
        {MONTHS.map((month) => (
          <span key={month}>{month.slice(0, 1)}</span>
        ))}
      </Months>
    </Year>
  );
}

function DateField({
  label,
  value,
  onChange,
  name,
}: {
  label: string;
  value: MonthDay;
  onChange: (value: MonthDay) => void;
  name: string;
}) {
  return (
    <Field label={label}>
      <Row style={{ flexWrap: "nowrap" }}>
        <Input
          name={`${name}-day`}
          type="number"
          min={1}
          max={31}
          value={value[1]}
          style={{ width: 80 }}
          onChange={(event) =>
            onChange([value[0], Math.floor(Number(event.target.value))])
          }
        />
        <Select
          name={`${name}-month`}
          value={value[0]}
          onChange={(event) => onChange([Number(event.target.value), value[1]])}
        >
          {MONTHS.map((month, i) => (
            <option key={month} value={i + 1}>
              {month}
            </option>
          ))}
        </Select>
      </Row>
    </Field>
  );
}

/**
 * The seasons: when each dresses the home background up, where a lost
 * streak goes back to, and its pictures, made here from the game's
 * backgrounds or a file, by day and by night.
 */
export function SeasonsTab({
  draft,
  update,
  problems,
  pictures,
  onPictures,
  pictureVersion,
}: TabProps) {
  const seasons = draft.seasons;
  const [index, setIndex] = React.useState(0);
  const season = seasons[index] as SeasonEntry | undefined;
  const order = seasons
    .map((item, i) => ({ item, i }))
    .sort((a, b) => dayOfYear(a.item.from) - dayOfYear(b.item.from));

  const setSeasons = (change: (list: SeasonEntry[]) => SeasonEntry[]) =>
    update((files) => ({ ...files, seasons: change(files.seasons) }));
  const edit = (patch: Partial<SeasonEntry>) => {
    if (!season) return;
    const next = { ...season, ...patch };
    // A renamed season keeps the pictures it has, by their old name.
    if (
      patch.id !== undefined &&
      season.pictures === undefined &&
      pictures.some(({ key }) => key === `seasons/${season.id}-day`)
    ) {
      next.pictures = season.id;
    }
    if (next.pictures === next.id) delete next.pictures;
    setSeasons((list) => replaced(list, season, next));
  };

  const has = (time: "day" | "night") =>
    season &&
    pictures.some(
      ({ key }) => key === `seasons/${pictureName(season)}-${time}`
    );
  const pathOf = (time: "day" | "night") =>
    season ? `pictures/seasons/${pictureName(season)}-${time}.webp` : "";
  const own = problems
    .filter(
      ({ file, message }) =>
        file === "seasons" &&
        season &&
        (message.startsWith(`${season.id}:`) ||
          message.includes(`seasons/${pictureName(season)}-`) ||
          message.includes(`"${season.id}"`))
    )
    .map(({ message }) => message);

  return (
    <>
      <Column aria-label="Seasons">
        <Heading>
          The year
          <Button
            onClick={() => {
              const id = freeId(
                "new-season",
                seasons.map((item) => item.id)
              );
              setSeasons((list) => [
                ...list,
                {
                  id,
                  home: "",
                  from: [1, 1],
                  to: [1, 1],
                  scene: { day: "", night: "" },
                },
              ]);
              setIndex(seasons.length);
            }}
          >
            + New season
          </Button>
        </Heading>
        <YearStrip seasons={seasons} selected={index} onPick={setIndex} />
        <Hint style={{ marginBottom: 10 }}>
          Between seasons, the home background is the Trinity library.
        </Hint>
        <List>
          {order.map(({ item, i }) => (
            <Item key={i} $active={i === index}>
              <ItemButton onClick={() => setIndex(i)}>
                <strong>{item.id}</strong>
                <small>
                  {when(item.from)} – {when(item.to)}
                </small>
              </ItemButton>
            </Item>
          ))}
        </List>
      </Column>

      <Column aria-label="Season">
        {season ? (
          <>
            <Heading>Season</Heading>
            <Problems messages={own} />
            <Field
              label="Id"
              hint={`Its name, and its pictures' (seasons/${season.id}-day). ?season=${season.id} previews it in npm run dev.`}
            >
              <Input
                name="season-id"
                value={season.id}
                onChange={(event) =>
                  edit({ id: slugOf(event.target.value, 40) })
                }
              />
            </Field>
            <Field
              label="Home"
              hint={`After a lost streak, the result says “Back to ${
                season.home || "…"
              }”.`}
            >
              <Input
                name="season-home"
                value={season.home}
                placeholder="the dessert café"
                onChange={(event) => edit({ home: event.target.value })}
              />
            </Field>
            <Row style={{ gap: 16, alignItems: "flex-start" }}>
              <DateField
                label="From"
                name="from"
                value={season.from}
                onChange={(from) => edit({ from })}
              />
              <DateField
                label="To (included)"
                name="to"
                value={season.to}
                onChange={(to) => edit({ to })}
              />
            </Row>
            <Hint style={{ marginBottom: 12 }}>
              On the player&apos;s own calendar. A season can run over New Year;
              two can&apos;t share a day.
            </Hint>

            <Heading>Pictures</Heading>
            <Field label="Whose">
              <Select
                name="season-pictures"
                value={pictureName(season)}
                onChange={(event) =>
                  edit({
                    pictures:
                      event.target.value === season.id
                        ? undefined
                        : event.target.value,
                  })
                }
              >
                <option value={season.id}>Its own</option>
                {seasons
                  .filter((other) => other !== season && !other.pictures)
                  .map((other) => (
                    <option key={other.id} value={other.id}>
                      Share {other.id}&apos;s
                    </option>
                  ))}
              </Select>
            </Field>
            <Pair>
              {(["day", "night"] as const).map((time) => (
                <figure key={time} style={{ margin: 0 }}>
                  {has(time) ? (
                    <img src={fileUrl(pathOf(time), pictureVersion)} alt="" />
                  ) : (
                    <Empty style={{ margin: 0 }}>No {time} picture yet</Empty>
                  )}
                  <figcaption>
                    <Hint>By {time}</Hint>
                  </figcaption>
                </figure>
              ))}
            </Pair>
            {pictureName(season) === season.id ? (
              <>
                <Field
                  label="Game backgrounds"
                  hint="By their name on the Blue Archive wiki (File:BG_<name>.jpg); the night one is often <name>_Night, and the same name twice makes the night by dimming the day."
                >
                  <Row style={{ flexWrap: "nowrap" }}>
                    <Input
                      name="scene-day"
                      value={season.scene.day}
                      placeholder="Day"
                      onChange={(event) =>
                        edit({
                          scene: {
                            ...season.scene,
                            day: event.target.value.trim(),
                          },
                        })
                      }
                    />
                    <Input
                      name="scene-night"
                      value={season.scene.night}
                      placeholder="Night"
                      onChange={(event) =>
                        edit({
                          scene: {
                            ...season.scene,
                            night: event.target.value.trim(),
                          },
                        })
                      }
                    />
                  </Row>
                </Field>
                {(["day", "night"] as const).map((time) => (
                  <React.Fragment key={time}>
                    <Heading>
                      {has(time) ? "Remake" : "Make"} the {time} picture
                    </Heading>
                    <PictureMaker
                      target={pathOf(time)}
                      styles={[
                        time === "day" ? "backdrop-day" : "backdrop-night",
                      ]}
                      background={season.scene[time]}
                      onMade={onPictures}
                    />
                  </React.Fragment>
                ))}
              </>
            ) : (
              <Hint style={{ marginBottom: 12 }}>
                Made with {pictureName(season)}&apos;s season.
              </Hint>
            )}

            <Heading>Delete</Heading>
            <Button
              $variant="danger"
              onClick={() => {
                if (!window.confirm(`Delete the season ${season.id}?`)) return;
                setSeasons((list) => list.filter((item) => item !== season));
                setIndex(0);
              }}
            >
              Delete this season
            </Button>
            <Hint>Its pictures stay, to delete in the Pictures tab.</Hint>
          </>
        ) : (
          <Empty>Add a season.</Empty>
        )}
      </Column>

      <PreviewPane
        view={
          season
            ? {
                kind: "season",
                id: season.id,
                home: season.home,
                from: season.from,
                to: season.to,
                day: has("day") ? fileUrl(pathOf("day"), pictureVersion) : "",
                night: has("night")
                  ? fileUrl(pathOf("night"), pictureVersion)
                  : "",
              }
            : { kind: "picture", key: "" }
        }
      />
    </>
  );
}
