import React from "react";

import type { Frame } from "../constants/cosmetics";
import type { Mission } from "../constants/missions";
import type { CosmeticsFile, IdsLock } from "../content/types";
import { freeId, moved, slugOf } from "./draft";
import { FrameFields } from "./FrameEditor";
import { isShipped } from "./lock";
import type { TabProps } from "./MissionsTab";
import {
  ColorField,
  IconPicker,
  PicturePicker,
  SCENE_PICTURES,
} from "./pickers";
import { PreviewPane } from "./PreviewPane";
import {
  Badge,
  Button,
  Card,
  Check,
  Column,
  Field,
  Heading,
  Hint,
  IconButton,
  Input,
  Item,
  ItemButton,
  List,
  Note,
  Problems,
  Row,
  Select,
} from "./ui";

type ListName = keyof CosmeticsFile;
/** Any reward, edited field by field. */
type Reward = CosmeticsFile[ListName][number] & Record<string, unknown>;

/** Each list, as players meet it. */
const LISTS: Record<ListName, { label: string; where: string }> = {
  titles: {
    label: "Titles",
    where: "the Sensei card and the profile's banner",
  },
  cardColors: { label: "Card colours", where: "the Sensei card" },
  cursorColors: { label: "Cursor colours", where: "Settings" },
  banners: { label: "Banners", where: "the profile and its card" },
  frames: { label: "Frames", where: "the profile and its card" },
  backgrounds: { label: "Backgrounds", where: "the profile and its card" },
  characters: { label: "Characters", where: "Settings" },
};

/** A new reward of a list, ready to fill in. */
function fresh(list: ListName, id: string): Reward {
  const base = { id, name: "" };
  switch (list) {
    case "cardColors":
      return {
        ...base,
        band: ["#128AFA", "#4DB6FF"],
        body: ["#FFFFFF", "#EAF4FF"],
        ink: "#1B2A4A",
        muted: "#6A7A99",
        accent: "#128AFA",
      } as Reward;
    case "cursorColors":
      return { ...base, hue: 200, swatch: hueSwatch(200) } as Reward;
    case "banners":
      return {
        ...base,
        fill: ["#22305A", "#2E4A8C"],
        ink: "#FFFFFF",
        accent: "#7FB0FF",
        emblem: "IoStar",
      } as Reward;
    case "frames":
      return {
        ...base,
        colors: ["#FFFFFF"],
        border: { width: 2, colors: [0] },
      } as Reward;
    case "backgrounds":
      return { ...base, picture: SCENE_PICTURES[0] } as Reward;
    default:
      return base as Reward;
  }
}

/** A swatch for a hue, as bright as the cursor's flash in it. */
const hueSwatch = (hue: number) => {
  const l = 0.62;
  const a = Math.min(l, 1 - l);
  const channel = (n: number) => {
    const k = (n + hue / 30) % 12;
    const c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(c * 255)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${channel(0)}${channel(8)}${channel(4)}`.toUpperCase();
};

/** The mission picker's "everyone's from the start". */
const FREE = "__free";

/** A reward's id from its name, while it still follows it. */
const autoId = (name: string, taken: string[]) =>
  freeId(slugOf(name || "new"), taken);

/**
 * Every reward a mission can unlock, a list each: add, edit, reorder and
 * retire, previewed where players see them.
 */
export function RewardsTab({ draft, update, shipped, problems }: TabProps) {
  const [list, setList] = React.useState<ListName>("titles");
  const [index, setIndex] = React.useState(0);
  const [unlocked, setUnlocked] = React.useState(true);
  const [screen, setScreen] = React.useState<
    "own" | "lobby" | "round" | "standings"
  >("own");
  const items = draft.cosmetics[list] as Reward[];
  const item = items[index] as Reward | undefined;
  const missions = draft.missions.missions;

  const setItems = (change: (items: Reward[]) => Reward[]) =>
    update((files) => ({
      ...files,
      cosmetics: {
        ...files.cosmetics,
        [list]: change(files.cosmetics[list] as Reward[]),
      },
    }));

  const edit = (patch: Record<string, unknown>) =>
    setItems((current) =>
      current.map((other, i) => {
        if (i !== index) return other;
        const next = { ...other, ...patch } as Reward;
        const others = current.filter((_, j) => j !== i).map(({ id }) => id);
        if (
          !("id" in patch) &&
          "name" in patch &&
          !isShipped(shipped, list, other.id) &&
          other.id === autoId(other.name, others)
        ) {
          next.id = autoId(next.name, others);
        }
        // Optional fields go, rather than stay as empty values.
        for (const [key, value] of Object.entries(patch)) {
          if (value === undefined || value === false) delete next[key];
        }
        return next;
      })
    );

  const add = () => {
    const id = autoId(
      "",
      items.map((other) => other.id)
    );
    setItems((current) => [...current, fresh(list, id)]);
    setIndex(items.length);
  };

  const view = {
    kind: "rewards" as const,
    list,
    cosmetics: draft.cosmetics,
    missions,
    index,
    unlocked,
    screen,
  };

  const own = item
    ? problems
        .filter(
          ({ file, message }) =>
            (file === "cosmetics" || file === "idsLock") &&
            (message.includes(` ${item.id}:`) ||
              message.includes(` ${item.id} `) ||
              message.startsWith(`${item.id}:`) ||
              message.includes(`"${item.id}"`))
        )
        .map(({ message }) => message)
    : [];

  return (
    <>
      <Column aria-label="Rewards">
        <Heading>Rewards</Heading>
        <List>
          {(Object.keys(LISTS) as ListName[]).map((name) => (
            <Item key={name} $active={name === list}>
              <ItemButton
                onClick={() => {
                  setList(name);
                  setIndex(0);
                }}
              >
                <strong>{LISTS[name].label}</strong>
                <small>
                  {draft.cosmetics[name].length} · in {LISTS[name].where}
                </small>
              </ItemButton>
            </Item>
          ))}
        </List>

        <Heading>
          {LISTS[list].label}
          {list === "characters" ? (
            <Hint>New ones: step 5</Hint>
          ) : (
            <Button onClick={add}>+ New</Button>
          )}
        </Heading>
        <List>
          {items.map((other, i) => (
            <Item key={i} $active={i === index} $faded={!!other.retired}>
              <ItemButton onClick={() => setIndex(i)}>
                <strong>{other.name || "(no name)"}</strong>
                <small>{other.id}</small>
              </ItemButton>
              {i === 0 ? (
                <Badge $tone="kept">Default</Badge>
              ) : (
                !isShipped(shipped, list, other.id) && (
                  <Badge $tone="new">New</Badge>
                )
              )}
              {other.retired && <Badge $tone="retired">Retired</Badge>}
              {i > 0 && (
                <>
                  <IconButton
                    aria-label={`Move ${other.name} up`}
                    disabled={i === 1}
                    onClick={() => {
                      setItems((current) => moved(current, i, i - 1));
                      if (index === i) setIndex(i - 1);
                    }}
                  >
                    ↑
                  </IconButton>
                  <IconButton
                    aria-label={`Move ${other.name} down`}
                    disabled={i === items.length - 1}
                    onClick={() => {
                      setItems((current) => moved(current, i, i + 1));
                      if (index === i) setIndex(i + 1);
                    }}
                  >
                    ↓
                  </IconButton>
                </>
              )}
            </Item>
          ))}
        </List>
      </Column>

      <Column aria-label="Edit">
        {item && (
          <RewardForm
            key={`${list}-${index}`}
            list={list}
            item={item}
            others={items}
            isDefault={index === 0}
            released={isShipped(shipped, list, item.id)}
            missions={missions}
            shipped={shipped}
            problems={own}
            onChange={edit}
            onNewMission={(mission) =>
              update((files) => ({
                ...files,
                missions: {
                  ...files.missions,
                  missions: [...files.missions.missions, mission],
                },
              }))
            }
            onDelete={() => {
              setItems((current) => current.filter((_, i) => i !== index));
              setIndex(Math.max(0, index - 1));
            }}
          />
        )}
      </Column>

      <PreviewPane
        view={view}
        extra={
          <>
            {["titles", "banners", "frames", "backgrounds"].includes(list) && (
              <Row style={{ marginBottom: 6 }}>
                <Hint>Where:</Hint>
                {(
                  [
                    ["own", list === "titles" ? "Sensei card" : "Profile"],
                    ["lobby", "Room lobby"],
                    ["round", "A round"],
                    ["standings", "Standings"],
                  ] as const
                ).map(([id, label]) => (
                  <Button
                    key={id}
                    $variant={screen === id ? "primary" : "plain"}
                    onClick={() => setScreen(id)}
                  >
                    {label}
                  </Button>
                ))}
              </Row>
            )}
            <Check style={{ margin: "0 0 4px" }}>
              <input
                type="checkbox"
                name="preview-unlocked"
                checked={unlocked}
                onChange={(event) => setUnlocked(event.target.checked)}
              />
              As a player who has unlocked everything (off: a new player)
            </Check>
          </>
        }
      />
    </>
  );
}

function RewardForm({
  list,
  item,
  others,
  isDefault,
  released,
  missions,
  shipped,
  problems,
  onChange,
  onNewMission,
  onDelete,
}: {
  list: ListName;
  item: Reward;
  /** The rest of its list. */
  others: Reward[];
  isDefault: boolean;
  released: boolean;
  missions: Mission[];
  shipped: IdsLock;
  problems: string[];
  onChange: (patch: Record<string, unknown>) => void;
  onNewMission: (mission: Mission) => void;
  onDelete: () => void;
}) {
  const mission = missions.find(({ id }) => id === item.mission);
  // A released reward keeps the mission it has while that mission is
  // live: whoever cleared it would lose the reward if another took over.
  // Once its mission is retired, a new one can, the old kept as former.
  const missionFixed = released && !!mission && !mission.retired;
  const formerMissions = (item.formerMissions as string[] | undefined) ?? [];

  /** "" is no mission yet; FREE is everyone's, on purpose. */
  const pickMission = (id: string) => {
    const old = item.mission as string | undefined;
    const mission = id === FREE ? "" : id;
    const former =
      released && old && old !== mission && !formerMissions.includes(old)
        ? [...formerMissions, old]
        : formerMissions;
    onChange({
      mission: mission || undefined,
      free: id === FREE || undefined,
      formerMissions: former.length > 0 ? former : undefined,
    });
  };

  const newMission = () => {
    const group =
      missions.find(({ id }) => id === item.mission)?.group ?? "kivotos";
    const id = freeId(
      slugOf(`${group} unlock ${item.name || item.id}`, 48),
      missions.map(({ id: other }) => other)
    );
    onNewMission({
      id,
      group,
      title: item.name ? `Unlock ${item.name}` : "",
      text: "",
      fact: "dailiesWon",
      goal: 1,
    });
    pickMission(id);
  };

  return (
    <>
      <Heading>
        {LISTS[list].label.replace(/s$/, "")}
        {isDefault ? (
          <Badge $tone="kept">Default: everyone has it</Badge>
        ) : released ? (
          <Badge $tone="kept">Released</Badge>
        ) : (
          <Badge $tone="new">Not released yet</Badge>
        )}
      </Heading>
      <Problems messages={problems} />

      <Field
        label="Name"
        hint={
          list === "titles"
            ? "Shown as the player's title, on the Sensei card and their banner."
            : `Its name in ${LISTS[list].where}.`
        }
      >
        <Input
          name="name"
          value={item.name}
          onChange={(event) => onChange({ name: event.target.value })}
        />
      </Field>
      <Field
        label="Id"
        hint={
          released || isDefault
            ? "Released: players' picks keep this id, so it never changes."
            : "Not released, so it can still change. It follows the name until you edit it."
        }
      >
        <Input
          name="id"
          value={item.id}
          readOnly={released || isDefault}
          onChange={(event) => onChange({ id: slugOf(event.target.value, 48) })}
        />
      </Field>

      {!isDefault && (
        <>
          <Heading>Unlocked by</Heading>
          <Field
            label="Mission"
            hint={
              missionFixed
                ? `Whoever cleared “${mission?.title}” has this: to change it, retire that mission first (Missions tab), and it's kept as a former one.`
                : list === "characters"
                ? "Or none: everyone has this character."
                : "Clearing it unlocks this, for good."
            }
          >
            <Select
              name="mission"
              value={
                item.free ? FREE : (item.mission as string | undefined) ?? ""
              }
              disabled={missionFixed}
              onChange={(event) => pickMission(event.target.value)}
            >
              <option value="">
                {list === "characters" ? "None: everyone's" : "Pick a mission…"}
              </option>
              {list !== "characters" && (
                <option value={FREE}>
                  None: everyone&apos;s from the start
                </option>
              )}
              {missions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.title || option.id}
                  {option.retired ? " (retired)" : ""}
                  {isShipped(shipped, "missions", option.id) ? "" : " (new)"}
                </option>
              ))}
            </Select>
          </Field>
          {!missionFixed && (
            <Row style={{ marginBottom: 12 }}>
              <Button onClick={newMission}>+ New mission for this</Button>
              <Hint>Made in the Missions tab, to fill in there.</Hint>
            </Row>
          )}
          {formerMissions.length > 0 && (
            <Note>
              Also kept by whoever cleared:{" "}
              {formerMissions
                .map((id) => missions.find((m) => m.id === id)?.title ?? id)
                .join(", ")}
            </Note>
          )}
        </>
      )}

      <Heading>Look</Heading>
      <LookFields list={list} item={item} others={others} onChange={onChange} />

      {!isDefault && (
        <>
          <Heading>{released ? "Retire" : "Delete"}</Heading>
          {released ? (
            <>
              <Hint style={{ marginBottom: 8 }}>
                A released reward is never deleted: retired, nobody new can get
                it, and whoever has it keeps wearing it. Its mission is retired
                too (Missions tab), or the check stops the save.
              </Hint>
              <Button onClick={() => onChange({ retired: !item.retired })}>
                {item.retired ? "Bring it back" : "Retire"}
              </Button>
            </>
          ) : (
            <>
              <Hint style={{ marginBottom: 8 }}>
                Not released yet, so nobody has it: it can go.
              </Hint>
              <Button
                $variant="danger"
                onClick={() => {
                  if (window.confirm(`Delete “${item.name || item.id}”?`)) {
                    onDelete();
                  }
                }}
              >
                Delete
              </Button>
            </>
          )}
        </>
      )}
    </>
  );
}

/** A list of colours, each its own field, with some to add or take away. */
function ColorList({
  colors,
  labels,
  min,
  onChange,
}: {
  colors: string[];
  labels: (i: number) => string;
  min: number;
  onChange: (colors: string[]) => void;
}) {
  return (
    <>
      {colors.map((color, i) => (
        <Field key={i} label={labels(i)}>
          <Row style={{ flexWrap: "nowrap" }}>
            <ColorField
              name={`color-${i}`}
              value={color}
              onChange={(next) =>
                onChange(colors.map((old, j) => (j === i ? next : old)))
              }
            />
            <IconButton
              aria-label="Remove colour"
              disabled={colors.length <= min}
              onClick={() => onChange(colors.filter((_, j) => j !== i))}
            >
              ✕
            </IconButton>
          </Row>
        </Field>
      ))}
      <Button
        style={{ marginBottom: 12 }}
        onClick={() =>
          onChange([...colors, colors[colors.length - 1] ?? "#FFFFFF"])
        }
      >
        + Colour
      </Button>
    </>
  );
}

function LookFields({
  list,
  item,
  others,
  onChange,
}: {
  list: ListName;
  item: Reward;
  others: Reward[];
  onChange: (patch: Record<string, unknown>) => void;
}) {
  const color = (key: string, label: string, hint?: string) => (
    <Field label={label} hint={hint}>
      <ColorField
        name={key}
        value={item[key] as string}
        onChange={(next) => onChange({ [key]: next })}
      />
    </Field>
  );
  const pair = (key: "band" | "body", i: 0 | 1, label: string) => (
    <Field label={label}>
      <ColorField
        name={`${key}-${i}`}
        value={(item[key] as string[])[i]}
        onChange={(next) => {
          const both = [...(item[key] as string[])];
          both[i] = next;
          onChange({ [key]: both });
        }}
      />
    </Field>
  );

  switch (list) {
    case "titles":
      return item.blank ? (
        <Hint>The blank title: a card shows no title until one is picked.</Hint>
      ) : (
        <Hint>A title is its name.</Hint>
      );

    case "cardColors":
      return (
        <>
          {pair("band", 0, "Band across the top, left")}
          {pair("band", 1, "Band, right")}
          {pair("body", 0, "Card, top")}
          {pair("body", 1, "Card, bottom")}
          {color("ink", "Names and numbers")}
          {color("muted", "Labels and the footer")}
          {color("accent", "The address, the title and the tiles' tint")}
        </>
      );

    case "cursorColors": {
      const mode = item.rainbow
        ? "rainbow"
        : item.hue === undefined
        ? "blue"
        : "hue";
      const hue = (item.hue as number | undefined) ?? 200;
      return (
        <>
          <Field label="Colour">
            <Select
              name="cursor-mode"
              value={mode}
              onChange={(event) => {
                const next = event.target.value;
                onChange({
                  hue: next === "hue" ? hue : undefined,
                  rainbow: next === "rainbow" ? true : undefined,
                  swatch:
                    next === "rainbow"
                      ? "linear-gradient(90deg, #ff4d4d, #ffd24d, #4dff88, #4dc3ff, #b84dff)"
                      : next === "hue"
                      ? hueSwatch(hue)
                      : "#3D63FF",
                });
              }}
            >
              <option value="hue">One colour</option>
              <option value="rainbow">Rainbow: a new colour every tap</option>
              <option value="blue">The game&apos;s own blue</option>
            </Select>
          </Field>
          {mode === "hue" && (
            <Field
              label={`Hue: ${hue}`}
              hint="Tap and drag in the preview to try it."
            >
              <input
                type="range"
                name="hue"
                min={0}
                max={359}
                value={hue}
                style={{ width: "100%", accentColor: hueSwatch(hue) }}
                onChange={(event) => {
                  const next = Number(event.target.value);
                  onChange({ hue: next, swatch: hueSwatch(next) });
                }}
              />
            </Field>
          )}
          <Field
            label="Swatch in Settings"
            hint="A colour or a CSS gradient. Set by itself from the hue."
          >
            <Row style={{ flexWrap: "nowrap" }}>
              <span
                style={{
                  width: 34,
                  height: 34,
                  flex: "none",
                  borderRadius: "50%",
                  background: item.swatch as string,
                }}
              />
              <Input
                name="swatch"
                value={item.swatch as string}
                onChange={(event) => onChange({ swatch: event.target.value })}
              />
            </Row>
          </Field>
        </>
      );
    }

    case "banners": {
      const picture = item.picture as string | undefined;
      if (item.blank) {
        return (
          <Hint>
            The blank banner: no strip; a title picked shows as words alone.
          </Hint>
        );
      }
      return (
        <>
          <Field label="Behind the title">
            <Select
              name="banner-look"
              value={picture ? "picture" : "foil"}
              onChange={(event) =>
                event.target.value === "picture"
                  ? onChange({
                      picture: SCENE_PICTURES[0],
                      tint: "#1B2A4A",
                      fill: undefined,
                    })
                  : onChange({
                      picture: undefined,
                      tint: undefined,
                      fill: ["#22305A", "#2E4A8C"],
                    })
              }
            >
              <option value="picture">A picture under a tint</option>
              <option value="foil">A foil of colours</option>
            </Select>
          </Field>
          {picture ? (
            <>
              <Field label="Picture">
                <PicturePicker
                  value={picture}
                  onChange={(key) => onChange({ picture: key })}
                />
              </Field>
              {color("tint", "Tint", "Over the picture, under the title.")}
            </>
          ) : (
            <ColorList
              colors={(item.fill as string[]) ?? []}
              min={2}
              labels={(i) => `Foil colour ${i + 1}, left to right`}
              onChange={(fill) => onChange({ fill })}
            />
          )}
          {color("ink", "Title")}
          {color("accent", "Emblem ring, stripes and the line along its foot")}
          <Field label="Emblem">
            <IconPicker
              value={item.emblem as string}
              onChange={(emblem) => onChange({ emblem })}
            />
          </Field>
        </>
      );
    }

    case "frames":
      return (
        <FrameFields
          frame={item as unknown as Frame}
          others={others as unknown as Frame[]}
          onChange={onChange}
        />
      );

    case "backgrounds":
      return item.picture === undefined ? (
        <Hint>
          No scene: the favourite student&apos;s portrait shows faded in.
        </Hint>
      ) : (
        <Field label="Scene">
          <PicturePicker
            value={item.picture as string}
            onChange={(key) => onChange({ picture: key })}
          />
        </Field>
      );

    case "characters":
      return (
        <Card>
          <Hint>
            Where she stands, her faces and her moods are edited in step 5.
          </Hint>
        </Card>
      );
  }
}
