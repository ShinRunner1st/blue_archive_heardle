import React from "react";
import styled from "styled-components";

import { ICONS, iconNamed } from "../constants/icons";
import { SHOWN_UPDATES } from "../constants/whatsNew";
import type { NewsEntry } from "../content/types";
import { freeId, moved, replaced, slugOf } from "./draft";
import type { TabProps } from "./MissionsTab";
import { PreviewPane } from "./PreviewPane";
import {
  Badge,
  Button,
  Card,
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
  TextArea,
} from "./ui";

const IconGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(40px, 1fr));
  gap: 4px;
  margin: 6px 0 10px;
`;

const IconChoice = styled.button.attrs({ type: "button" })<{
  $active: boolean;
}>`
  display: grid;
  place-items: center;
  height: 40px;
  font-size: 20px;
  color: inherit;
  border-radius: 6px;
  border: 1px solid
    ${({ $active, theme }) =>
      $active ? theme.border : "rgba(255, 255, 255, 0.12)"};
  background: ${({ $active, theme }) =>
    $active ? theme.blue : "rgba(255, 255, 255, 0.05)"};
  cursor: pointer;
`;

const IconName = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 18px;

  small {
    font-size: 12px;
    opacity: 0.6;
  }
`;

/** An update's id: the month it comes out, then its name. */
const newId = (name: string, taken: string[]) => {
  const month = new Date().toISOString().slice(0, 7);
  return freeId(`${month}-${slugOf(name) || "update"}`, taken);
};

/**
 * What's new: the updates, newest first, each with its items. A new one at
 * the top opens the pop-up once for every returning player.
 */
export function WhatsNewTab({ draft, update, problems }: TabProps) {
  const updates = draft.whatsNew;
  const [selected, setSelected] = React.useState<number | null>(
    updates.length > 0 ? 0 : null
  );
  const current = selected === null ? undefined : updates[selected];

  const setUpdates = (change: (list: NewsEntry[]) => NewsEntry[]) =>
    update((files) => ({ ...files, whatsNew: change(files.whatsNew) }));

  const editUpdate = (patch: Partial<NewsEntry>) => {
    if (!current) return;
    setUpdates((list) => replaced(list, current, { ...current, ...patch }));
  };

  const add = () => {
    const id = newId(
      "",
      updates.map((item) => item.id)
    );
    setUpdates((list) => [
      { id, name: "", items: [{ icon: "IoSparkles", title: "", text: "" }] },
      ...list,
    ]);
    setSelected(0);
  };

  const ownProblems = current
    ? problems
        .filter(
          ({ file, message }) =>
            file === "whatsNew" &&
            (message.startsWith(`${current.id}:`) ||
              message.includes(`"${current.id}"`))
        )
        .map(({ message }) => message)
    : [];

  return (
    <>
      <Column aria-label="Updates">
        <Heading>
          Updates
          <Button onClick={add}>+ New update</Button>
        </Heading>
        <Hint style={{ marginBottom: 8 }}>
          Newest first. Players see the top {SHOWN_UPDATES}.
        </Hint>
        <List>
          {updates.map((item, index) => (
            <Item
              key={index}
              $active={index === selected}
              $faded={index >= SHOWN_UPDATES}
            >
              <ItemButton onClick={() => setSelected(index)}>
                <strong>{item.name || "(no name)"}</strong>
                <small>{item.id}</small>
              </ItemButton>
              {index === 0 && <Badge $tone="new">Newest</Badge>}
              <IconButton
                aria-label={`Move ${item.name} up`}
                disabled={index === 0}
                onClick={() => {
                  setUpdates((list) => moved(list, index, index - 1));
                  if (selected === index) setSelected(index - 1);
                }}
              >
                ↑
              </IconButton>
              <IconButton
                aria-label={`Move ${item.name} down`}
                disabled={index === updates.length - 1}
                onClick={() => {
                  setUpdates((list) => moved(list, index, index + 1));
                  if (selected === index) setSelected(index + 1);
                }}
              >
                ↓
              </IconButton>
            </Item>
          ))}
        </List>
      </Column>

      <Column aria-label="Edit">
        {current && selected !== null ? (
          <>
            <Heading>Update</Heading>
            <Problems messages={ownProblems} />
            {selected === 0 && (
              <Note $tone="warn">
                The newest update: a new id here opens the pop-up once for every
                returning player. Only what players notice goes in (a new game
                or mode, new students, a change to how something plays), never
                how the site is built.
              </Note>
            )}
            <Field label="Heading" hint="The update's name in the pop-up.">
              <Input
                name="update-name"
                value={current.name}
                onChange={(event) => editUpdate({ name: event.target.value })}
              />
            </Field>
            <Field
              label="Id"
              hint="Each update has its own. A new one at the top is what shows the pop-up again."
            >
              <Input
                name="update-id"
                value={current.id}
                onChange={(event) =>
                  editUpdate({ id: slugOf(event.target.value, 48) })
                }
              />
            </Field>

            <Heading>
              Items
              <Button
                onClick={() =>
                  editUpdate({
                    items: [
                      ...current.items,
                      { icon: "IoSparkles", title: "", text: "" },
                    ],
                  })
                }
              >
                + Add item
              </Button>
            </Heading>
            {current.items.map((item, index) => (
              <NewsItemCard
                key={index}
                item={item}
                first={index === 0}
                last={index === current.items.length - 1}
                onChange={(next) =>
                  editUpdate({ items: replaced(current.items, item, next) })
                }
                onMove={(step) =>
                  editUpdate({
                    items: moved(current.items, index, index + step),
                  })
                }
                onRemove={() =>
                  editUpdate({
                    items: current.items.filter((other) => other !== item),
                  })
                }
              />
            ))}

            <Heading>Delete</Heading>
            <Button
              $variant="danger"
              onClick={() => {
                if (window.confirm(`Delete “${current.name || current.id}”?`)) {
                  setUpdates((list) => list.filter((u) => u !== current));
                  setSelected(updates.length > 1 ? 0 : null);
                }
              }}
            >
              Delete this update
            </Button>
          </>
        ) : (
          <Empty>Pick an update, or add one.</Empty>
        )}
      </Column>

      <PreviewPane view={{ kind: "whatsNew", updates }} />
    </>
  );
}

function NewsItemCard({
  item,
  first,
  last,
  onChange,
  onMove,
  onRemove,
}: {
  item: NewsEntry["items"][number];
  first: boolean;
  last: boolean;
  onChange: (item: NewsEntry["items"][number]) => void;
  onMove: (step: -1 | 1) => void;
  onRemove: () => void;
}) {
  const [picking, setPicking] = React.useState(false);
  const Icon = iconNamed(item.icon);

  return (
    <Card>
      <Row style={{ marginBottom: 8 }}>
        <IconName>
          <Icon aria-hidden="true" />
          <small>{item.icon}</small>
        </IconName>
        <Button onClick={() => setPicking(!picking)}>
          {picking ? "Done" : "Change icon"}
        </Button>
        <span style={{ marginLeft: "auto" }} />
        <IconButton aria-label="Up" disabled={first} onClick={() => onMove(-1)}>
          ↑
        </IconButton>
        <IconButton aria-label="Down" disabled={last} onClick={() => onMove(1)}>
          ↓
        </IconButton>
        <IconButton aria-label="Remove" onClick={onRemove}>
          ✕
        </IconButton>
      </Row>
      {picking && (
        <IconGrid role="radiogroup" aria-label="Icon">
          {Object.entries(ICONS).map(([name, Choice]) => (
            <IconChoice
              key={name}
              role="radio"
              aria-checked={name === item.icon}
              aria-label={name}
              title={name}
              $active={name === item.icon}
              onClick={() => onChange({ ...item, icon: name })}
            >
              <Choice aria-hidden="true" />
            </IconChoice>
          ))}
        </IconGrid>
      )}
      <Field label="Title">
        <Input
          name="item-title"
          value={item.title}
          onChange={(event) => onChange({ ...item, title: event.target.value })}
        />
      </Field>
      <Field label="Text">
        <TextArea
          name="item-text"
          value={item.text}
          onChange={(event) => onChange({ ...item, text: event.target.value })}
        />
      </Field>
    </Card>
  );
}
