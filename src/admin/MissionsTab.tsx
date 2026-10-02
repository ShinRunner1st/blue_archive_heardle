import React from "react";

import { MISSION_FACTS, Mission, MissionFact } from "../constants/missions";
import type { ContentFiles, CosmeticsFile, IdsLock } from "../content/types";
import type { ContentProblem } from "../content/validate";
import { unlocksOf } from "../helpers/cosmetics";
import { dayNumber } from "../helpers/daily";
import { FACT_RULES, ruleValues } from "../helpers/missionRules";
import {
  FACT_TOTALS,
  goalOf,
  missionFacts,
  missionValue,
} from "../helpers/missions";
import type { SaveFile } from "../helpers/saveFile";
import { MAX_DATA_BYTES, saveFromAccountData } from "./accountSave";
import { freeId, moved, replaced, slugOf, stepped } from "./draft";
import type { ContentState } from "./api";
import { isShipped } from "./lock";
import type { PictureEntry } from "./pictureRules";
import { PreviewPane } from "./PreviewPane";
import { RuleEditor } from "./RuleEditor";
import { ruleSentence } from "./ruleText";
import {
  Badge,
  Button,
  Card,
  Check,
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
  Note,
  Problems,
  Row,
  Select,
  TextArea,
} from "./ui";

export interface TabProps {
  draft: ContentFiles;
  update: (change: (files: ContentFiles) => ContentFiles) => void;
  shipped: IdsLock;
  problems: ContentProblem[];
  /** What the server said as the page loaded. */
  state: ContentState;
  /** The pictures cards, banners and seasons can show. */
  pictures: PictureEntry[];
  /**
   * A picture made or deleted: the list now, and a file made outside it
   * (a badge's cover).
   */
  onPictures: (pictures: PictureEntry[], made?: string) => void;
  /** Changes with every picture made, so thumbnails load again. */
  pictureVersion: string;
}

const FACTS = Object.keys(MISSION_FACTS) as MissionFact[];

/** A mission's id made from its tab and title, while it still follows them. */
const autoId = (mission: Mission, taken: string[]) =>
  freeId(slugOf(`${mission.group} ${mission.title || "new"}`), taken);

/** Cosmetics pointing at a mission follow it when its id changes. */
function renameRefs(
  cosmetics: CosmeticsFile,
  from: string,
  to: string
): CosmeticsFile {
  const swap = (id: string) => (id === from ? to : id);
  const next = {} as Record<string, unknown>;
  for (const [list, items] of Object.entries(cosmetics)) {
    next[list] = (items as Array<Record<string, unknown>>).map((item) => {
      const { mission, formerMissions } = item as {
        mission?: string;
        formerMissions?: string[];
      };
      if (mission !== from && !formerMissions?.includes(from)) return item;
      return {
        ...item,
        ...(mission !== undefined && { mission: swap(mission) }),
        ...(formerMissions && { formerMissions: formerMissions.map(swap) }),
      };
    });
  }
  return next as unknown as CosmeticsFile;
}

/** The problems that name this id, in the files that can hold it. */
const problemsOf = (problems: ContentProblem[], id: string) =>
  problems
    .filter(
      ({ message }) =>
        message.startsWith(`${id}:`) ||
        message.includes(`"${id}"`) ||
        message.includes(` ${id} `)
    )
    .map(({ message }) => message);

/**
 * Missions and their tabs: add, edit, reorder and retire, with the
 * Missions pop-up and the "Mission cleared!" toast drawn from the draft.
 */
export function MissionsTab({ draft, update, shipped, problems }: TabProps) {
  const { groups, missions } = draft.missions;
  const [groupId, setGroupId] = React.useState(groups[0]?.id ?? "");
  const [selected, setSelected] = React.useState<number | null>(null);
  const [value, setValue] = React.useState(0);
  const [toast, setToast] = React.useState(false);
  const [asGuest, setAsGuest] = React.useState(false);
  const [save, setSave] = React.useState<{ name: string; save: SaveFile }>();
  const [saveError, setSaveError] = React.useState("");

  // Every mission's count in the imported save, the draft's rules too.
  const counted = React.useMemo(() => {
    if (!save) return undefined;
    const facts = missionFacts(dayNumber(), save.save);
    const ruled = ruleValues(save.save, missions);
    return {
      values: Object.fromEntries(
        missions.map((item) => [item.id, missionValue(item, facts, ruled)])
      ),
      cleared: save.save.missions,
    };
  }, [save, missions]);

  const openSave = (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_DATA_BYTES) {
      setSaveError("That file is far bigger than any account's data.");
      return;
    }
    file.text().then((text) => {
      const result = saveFromAccountData(text);
      if (result.ok) {
        setSave({ name: file.name, save: result.save });
        setSaveError("");
      } else setSaveError(result.error);
    });
  };

  const group = groups.find(({ id }) => id === groupId) ?? groups[0];
  const mission = selected === null ? undefined : missions[selected];
  const inGroup = missions
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => item.group === group?.id);

  const setFile = (change: (file: ContentFiles["missions"]) => object) =>
    update((files) => ({
      ...files,
      missions: { ...files.missions, ...change(files.missions) },
    }));

  const editMission = (index: number, patch: Partial<Mission>) =>
    update((files) => {
      const list = files.missions.missions;
      const old = list[index];
      const next: Mission = { ...old, ...patch };
      for (const field of Object.keys(next) as Array<keyof Mission>) {
        if (next[field] === undefined) delete next[field];
      }
      const others = list.filter((other) => other !== old).map(({ id }) => id);
      if (
        !("id" in patch) &&
        !isShipped(shipped, "missions", old.id) &&
        old.id === autoId(old, others)
      ) {
        next.id = autoId(next, others);
      }
      if (next.retired === false) delete next.retired;
      return {
        ...files,
        missions: { ...files.missions, missions: replaced(list, old, next) },
        cosmetics:
          next.id === old.id
            ? files.cosmetics
            : renameRefs(files.cosmetics, old.id, next.id),
      };
    });

  const addMission = () => {
    if (!group) return;
    const fresh: Mission = {
      id: "",
      group: group.id,
      title: "",
      text: "",
      fact: FACTS[0],
      goal: 1,
    };
    fresh.id = autoId(
      fresh,
      missions.map(({ id }) => id)
    );
    setFile((file) => ({ missions: [...file.missions, fresh] }));
    setSelected(missions.length);
    setValue(0);
  };

  const addGroup = () => {
    const id = freeId(
      "new-tab",
      groups.map((item) => item.id)
    );
    setFile((file) => ({ groups: [...file.groups, { id, name: "New tab" }] }));
    setGroupId(id);
    setSelected(null);
  };

  const editGroup = (patch: { id?: string; name?: string }) => {
    if (!group) return;
    setFile((file) => ({
      groups: file.groups.map((item) =>
        item.id === group.id ? { ...item, ...patch } : item
      ),
      missions:
        patch.id === undefined
          ? file.missions
          : file.missions.map((item) =>
              item.group === group.id ? { ...item, group: patch.id! } : item
            ),
    }));
    if (patch.id !== undefined) setGroupId(patch.id);
  };

  const view = {
    kind: "missions" as const,
    groups,
    missions,
    cosmetics: draft.cosmetics,
    group: mission?.group ?? group?.id ?? "",
    selected: mission?.id,
    value,
    toast,
    ...(counted && { save: counted }),
    guest: asGuest,
  };
  const goal = mission ? goalOf(mission) : 0;
  const shown = missions.filter(
    (item) => !item.retired || counted?.cleared.includes(item.id)
  );
  const done = counted
    ? shown.filter(
        (item) =>
          counted.cleared.includes(item.id) ||
          counted.values[item.id] >= goalOf(item)
      ).length
    : 0;

  return (
    <>
      <Column aria-label="Tabs and missions">
        <Heading>
          Tabs
          <Button onClick={addGroup}>+ New tab</Button>
        </Heading>
        <List>
          {groups.map((item, index) => (
            <Item key={index} $active={item.id === group?.id}>
              <ItemButton
                onClick={() => {
                  setGroupId(item.id);
                  setSelected(null);
                }}
              >
                <strong>{item.name || "(no name)"}</strong>
                <small>
                  {missions.filter((m) => m.group === item.id).length} missions
                </small>
              </ItemButton>
              <IconButton
                aria-label={`Move ${item.name} up`}
                disabled={index === 0}
                onClick={() =>
                  setFile((file) => ({
                    groups: moved(file.groups, index, index - 1),
                  }))
                }
              >
                ↑
              </IconButton>
              <IconButton
                aria-label={`Move ${item.name} down`}
                disabled={index === groups.length - 1}
                onClick={() =>
                  setFile((file) => ({
                    groups: moved(file.groups, index, index + 1),
                  }))
                }
              >
                ↓
              </IconButton>
            </Item>
          ))}
        </List>

        <Heading>
          {group ? `In ${group.name}` : "Missions"}
          <Button onClick={addMission} disabled={!group}>
            + New mission
          </Button>
        </Heading>
        <List>
          {inGroup.map(({ item, index }) => (
            <Item
              key={index}
              $active={index === selected}
              $faded={item.retired}
            >
              <ItemButton
                onClick={() => {
                  setSelected(index);
                  setValue(0);
                }}
              >
                <strong>{item.title || "(no title)"}</strong>
                <small>{item.id}</small>
              </ItemButton>
              {!isShipped(shipped, "missions", item.id) && (
                <Badge $tone="new">New</Badge>
              )}
              {item.guests && <Badge $tone="kept">Starter</Badge>}
              {item.retired && <Badge $tone="retired">Retired</Badge>}
              <IconButton
                aria-label={`Move ${item.title} up`}
                onClick={() => {
                  const next = stepped(missions, item, -1, (other) => {
                    return other.group === item.group;
                  });
                  setFile(() => ({ missions: next }));
                  if (selected === index) setSelected(next.indexOf(item));
                }}
              >
                ↑
              </IconButton>
              <IconButton
                aria-label={`Move ${item.title} down`}
                onClick={() => {
                  const next = stepped(missions, item, 1, (other) => {
                    return other.group === item.group;
                  });
                  setFile(() => ({ missions: next }));
                  if (selected === index) setSelected(next.indexOf(item));
                }}
              >
                ↓
              </IconButton>
            </Item>
          ))}
        </List>
        {inGroup.length === 0 && <Empty>No missions in this tab yet.</Empty>}
      </Column>

      <Column aria-label="Edit">
        {mission && selected !== null ? (
          <MissionForm
            key={selected}
            mission={mission}
            groups={groups}
            cosmetics={draft.cosmetics}
            shipped={isShipped(shipped, "missions", mission.id)}
            problems={problemsOf(problems, mission.id)}
            onChange={(patch) => editMission(selected, patch)}
            onDelete={() => {
              setFile((file) => ({
                missions: file.missions.filter((_, i) => i !== selected),
              }));
              setSelected(null);
            }}
          />
        ) : group ? (
          <>
            <Heading>Tab</Heading>
            <Problems
              messages={problems
                .filter(
                  ({ file, message }) =>
                    file === "missions" &&
                    (message.startsWith(`group ${group.id}`) ||
                      message.startsWith(`${group.id}: every`) ||
                      message.includes(`"${group.id}"`))
                )
                .map(({ message }) => message)}
            />
            <Field label="Name" hint="The tab's name in the Missions pop-up.">
              <Input
                name="group-name"
                value={group.name}
                onChange={(event) => editGroup({ name: event.target.value })}
              />
            </Field>
            <Field
              label="Id"
              hint="Only this file uses it: changing it moves the tab's missions with it."
            >
              <Input
                name="group-id"
                value={group.id}
                onChange={(event) =>
                  editGroup({ id: slugOf(event.target.value) })
                }
              />
            </Field>
            <Row>
              <Button
                $variant="danger"
                disabled={inGroup.length > 0}
                onClick={() => {
                  setFile((file) => ({
                    groups: file.groups.filter(({ id }) => id !== group.id),
                  }));
                  setGroupId(
                    groups.find(({ id }) => id !== group.id)?.id ?? ""
                  );
                }}
              >
                Delete tab
              </Button>
              {inGroup.length > 0 && (
                <Hint>Only an empty tab can go: move its missions first.</Hint>
              )}
            </Row>
            <Note style={{ marginTop: 16 }}>
              Pick a mission on the left to edit it, or add one.
            </Note>
          </>
        ) : (
          <Empty>Add a tab to start.</Empty>
        )}
      </Column>

      <PreviewPane
        view={view}
        extra={
          <>
            <Row style={{ marginBottom: 4 }}>
              {save && counted ? (
                <>
                  <span>
                    <strong>{save.name}</strong>: {done} of {shown.length} done
                    {mission &&
                      `; this one ${
                        counted.cleared.includes(mission.id)
                          ? "cleared"
                          : `${Math.min(
                              counted.values[mission.id] ?? 0,
                              goal
                            )} / ${goal}`
                      }`}
                  </span>
                  <Button onClick={() => setSave(undefined)}>
                    Forget the save
                  </Button>
                </>
              ) : (
                <>
                  <label>
                    <Button as="span" role="button">
                      Preview a player&apos;s progress…
                    </Button>
                    <input
                      type="file"
                      name="preview-save"
                      accept=".json,application/json"
                      style={{ display: "none" }}
                      onChange={(event) => {
                        openSave(event.target.files?.[0]);
                        event.target.value = "";
                      }}
                    />
                  </label>
                  <Hint>
                    A Download my data file (☰ Profile, Account, signed in):
                    each mission&apos;s progress from its rounds, the
                    draft&apos;s new ones too. It stays on this PC.
                  </Hint>
                </>
              )}
            </Row>
            {saveError && <Note $tone="bad">{saveError}</Note>}
            {mission && (
              <Row style={{ marginBottom: 4 }}>
                {!save && (
                  <label>
                    Progress {Math.min(value, goal)} / {goal}{" "}
                    <input
                      type="range"
                      name="preview-progress"
                      min={0}
                      max={Number.isFinite(goal) ? goal : 1}
                      value={Math.min(value, goal)}
                      onChange={(event) => setValue(Number(event.target.value))}
                    />
                  </label>
                )}
                <Check style={{ margin: 0 }}>
                  <input
                    type="checkbox"
                    name="preview-toast"
                    checked={toast}
                    onChange={(event) => setToast(event.target.checked)}
                  />
                  Show the toast
                </Check>
              </Row>
            )}
            <Check style={{ margin: "0 0 4px" }}>
              <input
                type="checkbox"
                name="preview-guest"
                checked={asGuest}
                onChange={(event) => setAsGuest(event.target.checked)}
              />
              As a guest: the starter missions only
            </Check>
          </>
        }
      />
    </>
  );
}

function MissionForm({
  mission,
  groups,
  cosmetics,
  shipped,
  problems,
  onChange,
  onDelete,
}: {
  mission: Mission;
  groups: ContentFiles["missions"]["groups"];
  cosmetics: CosmeticsFile;
  shipped: boolean;
  problems: string[];
  onChange: (patch: Partial<Mission>) => void;
  onDelete: () => void;
}) {
  const unlocks = unlocksOf(mission.id, cosmetics, !!mission.retired);
  const hasAll = !!mission.fact && mission.fact in FACT_TOTALS;
  const { rule } = mission;

  return (
    <>
      <Heading>
        Mission
        {shipped ? (
          <Badge $tone="kept">Released</Badge>
        ) : (
          <Badge $tone="new">Not released yet</Badge>
        )}
      </Heading>
      <Problems messages={problems} />
      <Field label="Title">
        <Input
          name="title"
          value={mission.title}
          onChange={(event) => onChange({ title: event.target.value })}
        />
      </Field>
      <Field
        label="What to do"
        hint="As the game's own missions word it: “Guess 100 different songs, in Daily or Classic.”"
      >
        <TextArea
          name="text"
          value={mission.text}
          onChange={(event) => onChange({ text: event.target.value })}
        />
      </Field>
      <Field label="Tab">
        <Select
          name="group"
          value={mission.group}
          onChange={(event) => onChange({ group: event.target.value })}
        >
          {groups.map(({ id, name }) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </Select>
      </Field>
      <Check style={{ marginBottom: 4 }}>
        <input
          type="checkbox"
          name="guests"
          checked={!!mission.guests}
          onChange={(event) =>
            onChange({ guests: event.target.checked || undefined })
          }
        />
        Guests can clear this: a starter mission
      </Check>
      <Hint style={{ marginBottom: 12 }}>
        Guests see only the starter missions, one or two easy ones a tab, and
        wear only what those unlock; everything else needs an account.
        {!mission.guests &&
          unlocks.length > 0 &&
          " Its rewards are for accounts."}
        {mission.guests &&
          unlocks.length > 0 &&
          " Its rewards are starter ones."}
      </Hint>
      <Field
        label="What it counts"
        hint="Worked out from the player's saves, so rounds already played count."
      >
        <Select
          name="counts-by"
          value={rule ? "rule" : "fact"}
          onChange={(event) =>
            onChange(
              event.target.value === "rule"
                ? {
                    fact: undefined,
                    rule: (mission.fact && FACT_RULES[mission.fact]) || {
                      count: "rounds",
                    },
                    goal: mission.goal === "all" ? 1 : mission.goal,
                  }
                : { rule: undefined, fact: FACTS[0] }
            )
          }
        >
          <option value="fact">One of the game&apos;s own counts</option>
          <option value="rule">A rule: pick the rounds it counts</option>
        </Select>
      </Field>
      {rule ? (
        <Card>
          <RuleEditor
            rule={rule}
            onChange={(next) => onChange({ rule: next })}
          />
        </Card>
      ) : (
        <Field
          label="The count"
          hint={
            mission.fact && (
              <>
                {MISSION_FACTS[mission.fact]}.
                {FACT_RULES[mission.fact] &&
                  " A rule counts this the same: pick A rule above to start from it."}
              </>
            )
          }
        >
          <Select
            name="fact"
            value={mission.fact}
            onChange={(event) => {
              const fact = event.target.value as MissionFact;
              onChange({
                fact,
                goal:
                  mission.goal === "all" && !(fact in FACT_TOTALS)
                    ? 1
                    : mission.goal,
              });
            }}
          >
            {FACTS.map((fact) => (
              <option key={fact} value={fact}>
                {MISSION_FACTS[fact]}
              </option>
            ))}
          </Select>
        </Field>
      )}
      {hasAll && (
        <Check>
          <input
            type="checkbox"
            name="goal-all"
            checked={mission.goal === "all"}
            onChange={(event) =>
              onChange({ goal: event.target.checked ? "all" : 1 })
            }
          />
          Every one there is ({mission.fact && FACT_TOTALS[mission.fact]?.()}{" "}
          now; grows with the game)
        </Check>
      )}
      {mission.goal !== "all" && (
        <Field label="Goal" hint="The count that clears it.">
          <Input
            name="goal"
            type="number"
            min={1}
            step={1}
            value={mission.goal}
            onChange={(event) =>
              onChange({ goal: Math.floor(Number(event.target.value)) })
            }
          />
        </Field>
      )}
      {rule && mission.goal !== "all" && (
        <Row style={{ marginBottom: 12 }}>
          <Button
            onClick={() =>
              onChange({ text: ruleSentence(rule, mission.goal as number) })
            }
          >
            Word “What to do” from the rule
          </Button>
          <Hint>{ruleSentence(rule, mission.goal)}</Hint>
        </Row>
      )}
      <Field
        label="Id"
        hint={
          shipped
            ? "Released: players' saves and accounts keep this id, so it never changes."
            : "Not released, so it can still change. It follows the title until you edit it."
        }
      >
        <Input
          name="id"
          value={mission.id}
          readOnly={shipped}
          onChange={(event) => onChange({ id: slugOf(event.target.value, 48) })}
        />
      </Field>

      <Heading>Unlocks</Heading>
      {unlocks.length > 0 ? (
        <Note>{unlocks.join(", ")}</Note>
      ) : (
        <Hint style={{ marginBottom: 12 }}>
          Nothing yet. A reward picks the mission that unlocks it, in the
          rewards&apos; tabs.
        </Hint>
      )}
      {mission.retired && unlocks.length > 0 && (
        <Note $tone="warn">
          Retired, so nobody new can unlock these: give them a new mission, or
          retire them too.
        </Note>
      )}

      <Heading>{shipped ? "Retire" : "Delete"}</Heading>
      {shipped ? (
        <>
          <Hint style={{ marginBottom: 8 }}>
            A released mission is never deleted: retired, nobody can clear it
            any more, and whoever did keeps it, under Retired, with what it
            unlocked. To change what it asks, retire it and add a new one.
          </Hint>
          <Button onClick={() => onChange({ retired: !mission.retired })}>
            {mission.retired ? "Bring it back" : "Retire"}
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
              if (window.confirm(`Delete “${mission.title || mission.id}”?`)) {
                onDelete();
              }
            }}
          >
            Delete
          </Button>
        </>
      )}
    </>
  );
}
