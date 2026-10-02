import React from "react";
import styled from "styled-components";

import type { SpineCharacter, Touch } from "../constants/characters";
import type { Moods } from "../helpers/characterMood";
import { addCharacter, loadSprites } from "./api";
import type { CachedSprite } from "./characterServer";
import { slugOf } from "./draft";
import type { CharacterInfo } from "./messages";
import type { TabProps } from "./MissionsTab";
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
  TextArea,
} from "./ui";

type Info = Omit<CharacterInfo, "type" | "skel">;

/** A face is an animation named by its number: 00, 01... 99. */
const isFace = (name: string) => /^\d+$/.test(name);
const byNumber = (a: string, b: string) =>
  Number(a) - Number(b) || a.length - b.length;

const Faces = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 12px;
`;

const FaceButton = styled.button.attrs({ type: "button" })<{
  $on: boolean;
  $shown?: boolean;
}>`
  min-width: 38px;
  padding: 4px 6px;
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  color: inherit;
  border-radius: 6px;
  border: 2px solid
    ${({ $shown, theme }) => ($shown ? theme.orange : "transparent")};
  background: ${({ $on, theme }) =>
    $on ? theme.blue : "rgba(255, 255, 255, 0.08)"};
  cursor: pointer;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 6px 10px;
  margin-bottom: 12px;
`;

const Matches = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
  gap: 4px;
  max-height: 260px;
  overflow-y: auto;
  margin-bottom: 12px;
`;

/** A new character's set-up, to be filled in from her sprite's faces. */
function freshSetup(
  id: string,
  name: string,
  files: { skel: string; atlas: string },
  info: Info | undefined
): SpineCharacter {
  const faces = (info?.animations ?? []).filter(isFace).sort(byNumber);
  const face = (wanted: string) =>
    faces.includes(wanted) ? wanted : faces[0] ?? wanted;
  const rest = face("00");
  return {
    id,
    name,
    ...files,
    centerX: 0,
    eyes: 950,
    idle: "Idle_01",
    blink: "Eye_Close_01",
    blinkable: [rest],
    touch: null,
    moods: {
      idle: rest,
      listening: face("99"),
      wrong: rest,
      nervous: [rest, rest, rest, rest, rest],
      won: [rest, rest, rest, rest, rest, rest],
      lost: rest,
      tapped: faces.slice(0, 4).length > 1 ? faces.slice(0, 4) : [rest, rest],
    },
  };
}

/** Her touch set-up from what her sprite has, to adjust after. */
function freshTouch(character: SpineCharacter, info: Info | undefined): Touch {
  const names = info?.animations ?? [];
  const bones = info?.bones ?? [];
  const matching = (pattern: RegExp) => names.filter((n) => pattern.test(n));
  return {
    point: bones.find((b) => /touch_point/i.test(b)) ?? "Touch_Point",
    eye: bones.find((b) => /touch_eye/i.test(b)) ?? "Touch_Eye",
    pointSetup: [character.centerX, character.eyes + 90],
    pat: [character.centerX, character.eyes + 170, 200],
    lookMax: 100,
    patMax: 60,
    lookEyes: 0.4,
    look: {
      loop: matching(/^Look_\d+_[MA]$/),
      end: matching(/^LookEnd_\d+_[MA]$/),
    },
    stroke: {
      loop: matching(/^Pat_\d+_[MA]$/),
      end: matching(/^PatEnd_\d+_[MA]$/),
    },
  };
}

/**
 * The characters beside the game: where each stands, her face for each
 * moment of a round, which faces her blink suits, and her pat and look.
 * A new one comes from the students' sprites the game's files left here,
 * or from her files dropped in, through build-spine.py.
 */
export function CharactersTab({ draft, update, shipped, problems }: TabProps) {
  const characters = draft.characters;
  const [selected, setSelected] = React.useState<number | "new">(0);
  const [infos, setInfos] = React.useState<Record<string, Info>>({});
  const [face, setFace] = React.useState<string>("");
  const [guides, setGuides] = React.useState(true);
  const character =
    selected === "new" ? undefined : (characters[selected] as SpineCharacter);
  const [preview, setPreview] = React.useState<SpineCharacter | null>(null);

  // What each sprite has, as the preview frame reports it.
  React.useEffect(() => {
    const take = (event: MessageEvent) => {
      const data = event.data as CharacterInfo | undefined;
      if (
        event.origin !== window.location.origin ||
        data?.type !== "admin-character-info"
      ) {
        return;
      }
      setInfos((all) => ({
        ...all,
        [data.skel]: { animations: data.animations, bones: data.bones },
      }));
    };
    window.addEventListener("message", take);
    return () => window.removeEventListener("message", take);
  }, []);

  const shown = character ?? preview;
  const info = shown ? infos[shown.skel] : undefined;
  const faces = (info?.animations ?? []).filter(isFace).sort(byNumber);
  const released = (id: string) =>
    id === "arona" || id === "plana" || shipped.characters.includes(id);

  const edit = (patch: Partial<SpineCharacter>) => {
    if (selected === "new") return;
    update((files) => ({
      ...files,
      characters: files.characters.map((item, i) =>
        i === selected ? { ...item, ...patch } : item
      ),
    }));
  };
  const editMoods = (patch: Partial<Moods>) =>
    character && edit({ moods: { ...character.moods, ...patch } });
  const editTouch = (patch: Partial<Touch>) =>
    character?.touch && edit({ touch: { ...character.touch, ...patch } });

  const own = character
    ? problems
        .filter(
          ({ file, message }) =>
            (file === "characters" || file === "cosmetics") &&
            message.startsWith(`${character.id}:`)
        )
        .map(({ message }) => message)
    : [];

  const faceSelect = (
    label: string,
    value: string,
    onChange: (next: string) => void,
    name: string
  ) => (
    <Field key={name} label={label}>
      <Row style={{ flexWrap: "nowrap" }}>
        <Select
          name={name}
          value={value}
          onChange={(event) => {
            onChange(event.target.value);
            setFace(event.target.value);
          }}
        >
          {!faces.includes(value) && <option value={value}>{value}</option>}
          {faces.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </Select>
        <IconButton aria-label={`Show ${value}`} onClick={() => setFace(value)}>
          ▶
        </IconButton>
      </Row>
    </Field>
  );

  const toggles = (
    picked: string[],
    options: string[],
    onChange: (next: string[]) => void
  ) => (
    <Faces>
      {options.map((option) => (
        <FaceButton
          key={option}
          $on={picked.includes(option)}
          $shown={option === face}
          onClick={() => {
            onChange(
              picked.includes(option)
                ? picked.filter((other) => other !== option)
                : [...picked, option]
            );
            if (isFace(option)) setFace(option);
          }}
        >
          {option}
        </FaceButton>
      ))}
    </Faces>
  );

  return (
    <>
      <Column aria-label="Characters">
        <Heading>
          Characters
          <Button onClick={() => setSelected("new")}>+ New character</Button>
        </Heading>
        <List>
          {characters.map((item, i) => (
            <Item key={item.id} $active={i === selected}>
              <ItemButton
                onClick={() => {
                  setSelected(i);
                  setFace(item.moods.idle);
                }}
              >
                <strong>{item.name}</strong>
                <small>{item.id}</small>
              </ItemButton>
              {!released(item.id) && <Badge $tone="new">New</Badge>}
            </Item>
          ))}
        </List>
        <Hint style={{ marginTop: 10 }}>
          Who unlocks each is picked in Rewards › Characters.
        </Hint>
      </Column>

      <Column aria-label="Character">
        {selected === "new" ? (
          <NewCharacter
            taken={characters.map(({ id }) => id)}
            onPreview={(sprite) => {
              setPreview(sprite);
              setFace("00");
            }}
            onAdded={(id, name, files) => {
              const setup = freshSetup(
                id,
                name,
                files,
                preview ? infos[preview.skel] : undefined
              );
              update((all) => ({
                ...all,
                characters: [...all.characters, setup],
                cosmetics: all.cosmetics.characters.some((c) => c.id === id)
                  ? all.cosmetics
                  : {
                      ...all.cosmetics,
                      characters: [...all.cosmetics.characters, { id, name }],
                    },
              }));
              setPreview(null);
              setSelected(characters.length);
              setFace(setup.moods.idle);
            }}
          />
        ) : character ? (
          <>
            <Heading>
              {character.name}
              {released(character.id) ? (
                <Badge $tone="kept">Released</Badge>
              ) : (
                <Badge $tone="new">Not released yet</Badge>
              )}
            </Heading>
            <Problems messages={own} />
            {!info && (
              <Note>
                Loading her sprite in the preview, for its faces… (the preview
                must be at 1920×911)
              </Note>
            )}
            <Field label="Name">
              <Input
                name="character-name"
                value={character.name}
                onChange={(event) => edit({ name: event.target.value })}
              />
            </Field>
            <Field
              label="Notes"
              hint="Why her faces are as they are, for whoever edits them next."
            >
              <TextArea
                name="character-note"
                value={character.note ?? ""}
                onChange={(event) =>
                  edit({ note: event.target.value || undefined })
                }
              />
            </Field>
            <Hint style={{ marginBottom: 12 }}>
              {character.id} · public/spine/{character.skel}
            </Hint>

            <Heading>Where she stands</Heading>
            <Field
              label={`Eye height: ${character.eyes}`}
              hint="So her face sits where everyone's does: put the gold line through her eyes."
            >
              <input
                type="range"
                name="eyes"
                min={300}
                max={1800}
                value={character.eyes}
                style={{ width: "100%" }}
                onChange={(event) => edit({ eyes: Number(event.target.value) })}
              />
            </Field>
            <Field
              label={`Middle: ${character.centerX}`}
              hint="The blue line through the middle of her body."
            >
              <input
                type="range"
                name="center"
                min={-500}
                max={500}
                value={character.centerX}
                style={{ width: "100%" }}
                onChange={(event) =>
                  edit({ centerX: Number(event.target.value) })
                }
              />
            </Field>

            <Heading>Her faces</Heading>
            <Hint style={{ marginBottom: 6 }}>
              Click one to see it. Orange: the one shown.
            </Hint>
            <Faces>
              {faces.map((option) => (
                <FaceButton
                  key={option}
                  $on={false}
                  $shown={option === face}
                  onClick={() => setFace(option)}
                >
                  {option}
                </FaceButton>
              ))}
            </Faces>

            <Heading>Each moment of a round</Heading>
            <Grid>
              {faceSelect(
                "At rest",
                character.moods.idle,
                (idle) => editMoods({ idle }),
                "mood-idle"
              )}
              {faceSelect(
                "While the clip plays",
                character.moods.listening,
                (listening) => editMoods({ listening }),
                "mood-listening"
              )}
              {faceSelect(
                "A wrong guess, for a moment",
                character.moods.wrong,
                (wrong) => editMoods({ wrong }),
                "mood-wrong"
              )}
              {faceSelect(
                "Lost",
                character.moods.lost,
                (lost) => editMoods({ lost }),
                "mood-lost"
              )}
            </Grid>
            <Hint style={{ marginBottom: 6 }}>
              Nervous, after each try used:
            </Hint>
            <Grid>
              {character.moods.nervous.map((value, i) =>
                faceSelect(
                  `After try ${i + 1}`,
                  value,
                  (next) =>
                    editMoods({
                      nervous: character.moods.nervous.map((old, j) =>
                        j === i ? next : old
                      ),
                    }),
                  `mood-nervous-${i}`
                )
              )}
            </Grid>
            <Hint style={{ marginBottom: 6 }}>Won, on each try:</Hint>
            <Grid>
              {character.moods.won.map((value, i) =>
                faceSelect(
                  `On try ${i + 1}`,
                  value,
                  (next) =>
                    editMoods({
                      won: character.moods.won.map((old, j) =>
                        j === i ? next : old
                      ),
                    }),
                  `mood-won-${i}`
                )
              )}
            </Grid>
            <Field label="Tapped: one of these at random">
              {toggles(character.moods.tapped, faces, (tapped) =>
                editMoods({ tapped })
              )}
            </Field>

            <Heading>Blinking</Heading>
            <Row style={{ marginBottom: 10 }}>
              <Field label="Idle animation">
                <Select
                  name="idle-animation"
                  value={character.idle}
                  onChange={(event) => edit({ idle: event.target.value })}
                >
                  {[character.idle, ...(info?.animations ?? [])]
                    .filter((n, i, all) => all.indexOf(n) === i && !isFace(n))
                    .map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                </Select>
              </Field>
              <Field label="Blink">
                <Select
                  name="blink"
                  value={character.blink ?? ""}
                  onChange={(event) =>
                    edit({ blink: event.target.value || null })
                  }
                >
                  <option value="">None</option>
                  {(info?.animations ?? [])
                    .filter((n) => /eye|blink/i.test(n))
                    .map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                </Select>
              </Field>
            </Row>
            <Field
              label="Faces a blink suits"
              hint="A blink swaps her eyes for the face it was drawn on: on any other it leaves plain open eyes behind. The face at rest must be one."
            >
              {toggles(character.blinkable, faces, (blinkable) =>
                edit({ blinkable })
              )}
            </Field>

            <Heading>Held and stroked</Heading>
            <Check>
              <input
                type="checkbox"
                name="touch"
                checked={!!character.touch}
                onChange={(event) =>
                  edit({
                    touch: event.target.checked
                      ? freshTouch(character, info)
                      : null,
                  })
                }
              />
              She can be held (looks at you) and her head stroked
            </Check>
            {!character.touch && (
              <Hint style={{ marginBottom: 12 }}>
                Without it she can only be tapped. Her sprite needs touch bones
                {info &&
                  (info.bones.some((b) => /touch_point/i.test(b))
                    ? ": hers has them."
                    : ": hers has none.")}
              </Hint>
            )}
            {character.touch && (
              <TouchFields
                touch={character.touch}
                info={info}
                onChange={editTouch}
                toggles={toggles}
              />
            )}

            {!released(character.id) && (
              <>
                <Heading>Delete</Heading>
                <Button
                  $variant="danger"
                  onClick={() => {
                    if (!window.confirm(`Delete ${character.name}?`)) return;
                    update((files) => ({
                      ...files,
                      characters: files.characters.filter(
                        ({ id }) => id !== character.id
                      ),
                      cosmetics: {
                        ...files.cosmetics,
                        characters: files.cosmetics.characters.filter(
                          ({ id }) => id !== character.id
                        ),
                      },
                    }));
                    setSelected(0);
                  }}
                >
                  Delete
                </Button>
                <Hint>
                  Her files stay in public/spine/{character.id}/, to delete by
                  hand.
                </Hint>
              </>
            )}
          </>
        ) : null}
      </Column>

      <PreviewPane
        view={
          shown
            ? {
                kind: "character",
                character: shown,
                face: face || shown.moods.idle,
                guides,
              }
            : { kind: "picture", key: "" }
        }
        extra={
          <Row style={{ marginBottom: 4 }}>
            <Check style={{ margin: 0 }}>
              <input
                type="checkbox"
                name="guides"
                checked={guides}
                onChange={(event) => setGuides(event.target.checked)}
              />
              Guides
            </Check>
            <Hint>
              Face {face || shown?.moods.idle}. Hold, stroke and tap her in the
              preview, as in the game.
            </Hint>
          </Row>
        }
      />
    </>
  );
}

function TouchFields({
  touch,
  info,
  onChange,
  toggles,
}: {
  touch: Touch;
  info: Info | undefined;
  onChange: (patch: Partial<Touch>) => void;
  toggles: (
    picked: string[],
    options: string[],
    onChange: (next: string[]) => void
  ) => React.ReactNode;
}) {
  const bones = info?.bones ?? [];
  const holds = (info?.animations ?? []).filter((n) => /look|pat/i.test(n));
  const number = (
    label: string,
    value: number,
    set: (n: number) => void,
    name: string,
    step = 1
  ) => (
    <Field label={label}>
      <Input
        name={name}
        type="number"
        step={step}
        value={value}
        onChange={(event) => set(Number(event.target.value))}
      />
    </Field>
  );
  return (
    <Card>
      <Row>
        <Field label="Point bone">
          <Select
            name="touch-point"
            value={touch.point}
            onChange={(event) => onChange({ point: event.target.value })}
          >
            {[touch.point, ...bones]
              .filter((b, i, all) => all.indexOf(b) === i)
              .map((bone) => (
                <option key={bone}>{bone}</option>
              ))}
          </Select>
        </Field>
        <Field label="Eye bone">
          <Select
            name="touch-eye"
            value={touch.eye}
            onChange={(event) => onChange({ eye: event.target.value })}
          >
            {[touch.eye, ...bones]
              .filter((b, i, all) => all.indexOf(b) === i)
              .map((bone) => (
                <option key={bone}>{bone}</option>
              ))}
          </Select>
        </Field>
      </Row>
      <Hint style={{ marginBottom: 6 }}>
        The pink dot is where the point bone rests; the pink circle, where a
        stroke counts as a pat.
      </Hint>
      <Grid>
        {number(
          "Point x",
          touch.pointSetup[0],
          (x) => onChange({ pointSetup: [x, touch.pointSetup[1]] }),
          "point-x"
        )}
        {number(
          "Point y",
          touch.pointSetup[1],
          (y) => onChange({ pointSetup: [touch.pointSetup[0], y] }),
          "point-y"
        )}
        {number(
          "Pat x",
          touch.pat[0],
          (x) => onChange({ pat: [x, touch.pat[1], touch.pat[2]] }),
          "pat-x"
        )}
        {number(
          "Pat y",
          touch.pat[1],
          (y) => onChange({ pat: [touch.pat[0], y, touch.pat[2]] }),
          "pat-y"
        )}
        {number(
          "Pat radius",
          touch.pat[2],
          (r) => onChange({ pat: [touch.pat[0], touch.pat[1], r] }),
          "pat-r"
        )}
        {number(
          "Furthest look",
          touch.lookMax,
          (lookMax) => onChange({ lookMax }),
          "look-max"
        )}
        {number(
          "Furthest pat",
          touch.patMax,
          (patMax) => onChange({ patMax }),
          "pat-max"
        )}
        {number(
          "Eyes follow (0-1)",
          touch.lookEyes,
          (lookEyes) => onChange({ lookEyes }),
          "look-eyes",
          0.05
        )}
      </Grid>
      <Field label="Look, while held">
        {toggles(touch.look.loop, holds, (loop) =>
          onChange({ look: { ...touch.look, loop } })
        )}
      </Field>
      <Field label="Look, as it ends">
        {toggles(touch.look.end, holds, (end) =>
          onChange({ look: { ...touch.look, end } })
        )}
      </Field>
      <Field label="Pat, while stroked">
        {toggles(touch.stroke.loop, holds, (loop) =>
          onChange({ stroke: { ...touch.stroke, loop } })
        )}
      </Field>
      <Field label="Pat, as it ends">
        {toggles(touch.stroke.end, holds, (end) =>
          onChange({ stroke: { ...touch.stroke, end } })
        )}
      </Field>
    </Card>
  );
}

/**
 * A new character: a student's sprite from the game's files on this PC,
 * seen in the preview before she's added, or her files dropped in.
 */
function NewCharacter({
  taken,
  onPreview,
  onAdded,
}: {
  taken: string[];
  onPreview: (character: SpineCharacter) => void;
  onAdded: (
    id: string,
    name: string,
    files: { skel: string; atlas: string }
  ) => void;
}) {
  const [sprites, setSprites] = React.useState<CachedSprite[] | null>(null);
  const [query, setQuery] = React.useState("");
  const [sprite, setSprite] = React.useState("");
  const [upload, setUpload] = React.useState<
    Array<{ name: string; data: string }>
  >([]);
  const [id, setId] = React.useState("");
  const [name, setName] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    loadSprites().then(setSprites);
  }, []);

  const words = query.trim().toLowerCase();
  const matches = (sprites ?? [])
    .filter(({ name: n }) => !words || n.toLowerCase().includes(words))
    .slice(0, 60);

  const pick = (picked: string) => {
    setSprite(picked);
    setUpload([]);
    const base = picked.toLowerCase();
    setId(slugOf(base.replace(/_/g, "-")));
    setName(
      picked
        .split("_")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ")
    );
    onPreview({
      ...freshSetup(
        "_preview",
        picked,
        {
          skel: `_cache/${picked}_spr.skel`,
          atlas: `_cache/${picked}_spr.atlas`,
        },
        undefined
      ),
    });
  };

  const add = async () => {
    setBusy(true);
    setError("");
    const result = await addCharacter(
      sprite ? { id, sprite } : { id, upload }
    ).catch((reason: unknown) => ({
      ok: false as const,
      error: String(reason),
    }));
    setBusy(false);
    if (result.ok)
      onAdded(id, name, { skel: result.skel, atlas: result.atlas });
    else setError(result.error);
  };

  return (
    <>
      <Heading>New character</Heading>
      <Field
        label={`From the game's files${
          sprites ? ` (${sprites.length} students here)` : ""
        }`}
        hint="Each student's sprite in .cache/game/sprites/, by the game's own name (hina, aru_newyear, CH0058). Pick one to see her in the preview first."
      >
        <Input
          name="sprite-search"
          value={query}
          placeholder="hina"
          onChange={(event) => setQuery(event.target.value)}
        />
      </Field>
      {sprites && sprites.length === 0 && (
        <Note $tone="warn">
          None here: the game&apos;s files haven&apos;t been fetched on this PC
          (README, &quot;The game&apos;s files&quot;). Drop her files below
          instead.
        </Note>
      )}
      <Matches>
        {matches.map(({ name: option, kb }) => (
          <FaceButton
            key={option}
            $on={option === sprite}
            onClick={() => pick(option)}
            title={`${kb} KB before WebP`}
          >
            {option}
          </FaceButton>
        ))}
      </Matches>
      <Field
        label="Or her files"
        hint="Her Spine 4.2 .skel, .atlas and .png, picked together."
      >
        <input
          type="file"
          name="character-files"
          multiple
          accept=".skel,.atlas,.png"
          onChange={(event) => {
            const files = [...(event.target.files ?? [])];
            Promise.all(
              files.map(
                (file) =>
                  new Promise<{ name: string; data: string }>((done) => {
                    const reader = new FileReader();
                    reader.onload = () =>
                      done({ name: file.name, data: String(reader.result) });
                    reader.readAsDataURL(file);
                  })
              )
            ).then((read) => {
              setUpload(read);
              setSprite("");
            });
          }}
        />
      </Field>
      <Row style={{ alignItems: "flex-start" }}>
        <Field label="Id" hint="Her folder, public/spine/<id>/; kept in picks.">
          <Input
            name="new-id"
            value={id}
            onChange={(event) => setId(slugOf(event.target.value))}
          />
        </Field>
        <Field label="Name" hint="As Settings lists her.">
          <Input
            name="new-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </Field>
      </Row>
      {taken.includes(id) && (
        <Note $tone="warn">There&apos;s a character {id} already.</Note>
      )}
      {error && <Note $tone="bad">{error}</Note>}
      <Button
        $variant="primary"
        disabled={
          busy ||
          !id ||
          !name ||
          taken.includes(id) ||
          (!sprite && !upload.length)
        }
        onClick={add}
      >
        {busy ? "Adding…" : "Add her"}
      </Button>
      <Hint style={{ marginTop: 8 }}>
        build-spine.py copies her into public/spine/{id || "<id>"}/, the texture
        as WebP (about 0.7-1.4 MB, on the site; a player downloads it only if
        they pick her, on a wide screen). Then set her faces here and who
        unlocks her in Rewards.
      </Hint>
    </>
  );
}
