import React from "react";

import { pictureFiles } from "../constants/pictureFiles";
import { CONTENT_FILE_PATHS, type ContentFiles } from "../content/types";
import { checkContent } from "../content/validate";
import { type ContentState, loadContent, saveContent } from "./api";
import { changedFiles } from "./draft";
import {
  type History,
  type HistoryAction,
  historyReducer,
  startHistory,
  undoKey,
} from "./history";
import { nextLock } from "./lock";
import type { PictureEntry } from "./pictureRules";
import { MissionsTab } from "./MissionsTab";
import { BadgesTab } from "./BadgesTab";
import { CharactersTab } from "./CharactersTab";
import { PagePicturesTab } from "./PagePicturesTab";
import { PicturesTab } from "./PicturesTab";
import { RewardsTab } from "./RewardsTab";
import { SeasonsTab } from "./SeasonsTab";
import { Brand, Body, Button, Note, Row, Shell, Tab, Tabs, TopBar } from "./ui";
import { WhatsNewTab } from "./WhatsNewTab";

const TABS = {
  missions: { label: "Missions", Component: MissionsTab },
  rewards: { label: "Rewards", Component: RewardsTab },
  characters: { label: "Characters", Component: CharactersTab },
  pictures: { label: "Pictures", Component: PicturesTab },
  seasons: { label: "Seasons", Component: SeasonsTab },
  pages: { label: "Page pictures", Component: PagePicturesTab },
  badges: { label: "OST badges", Component: BadgesTab },
  whatsNew: { label: "What's new", Component: WhatsNewTab },
} as const;
type TabId = keyof typeof TABS;

/** Unsaved work, kept in this browser so a closed tab loses nothing. */
const DRAFT_KEY = "admin-draft";
/** A line to show after the page reloads itself on a save. */
const FLASH_KEY = "admin-flash";

interface StoredDraft {
  /** The files on disk when the draft began. */
  disk: string;
  files: ContentFiles;
}

function readStored<T>(storage: Storage, key: string): T | null {
  try {
    const text = storage.getItem(key);
    return text ? (JSON.parse(text) as T) : null;
  } catch {
    return null;
  }
}

function store(storage: Storage, key: string, value: unknown): void {
  try {
    if (value === null) storage.removeItem(key);
    else storage.setItem(key, JSON.stringify(value));
  } catch {
    // Kept in the page only.
  }
}

/**
 * The admin tool: the content files in tabs, a draft of every change, the
 * content test's checks on the draft as it's typed, and Save, which writes
 * the files once the checks pass (the server checks again).
 */
export function AdminApp() {
  const [state, setState] = React.useState<ContentState | null>(null);
  const [history, dispatch] = React.useReducer(
    historyReducer as (
      history: History<ContentFiles | null>,
      action: HistoryAction<ContentFiles | null>
    ) => History<ContentFiles | null>,
    null,
    () => startHistory<ContentFiles | null>(null)
  );
  const draft = history.present;
  /** The draft set as a step of its own, to undo back from. */
  const setDraft = (next: ContentFiles) => dispatch({ type: "step", next });
  const [error, setError] = React.useState("");
  const [tab, setTab] = React.useState<TabId>(
    () => readStored<TabId>(localStorage, "admin-tab") ?? "missions"
  );
  const [restore, setRestore] = React.useState<StoredDraft | null>(null);
  const [flash, setFlash] = React.useState(
    () => readStored<string>(sessionStorage, FLASH_KEY) ?? ""
  );
  const [saving, setSaving] = React.useState(false);
  const [pictures, setPictures] = React.useState<PictureEntry[]>([]);
  const [pictureVersion, setPictureVersion] = React.useState("");
  const [made, setMade] = React.useState<string[]>([]);

  React.useEffect(() => {
    store(sessionStorage, FLASH_KEY, null);
    loadContent()
      .then((loaded) => {
        setState(loaded);
        dispatch({ type: "reset", next: loaded.files });
        setPictures(loaded.pictures);
        const kept = readStored<StoredDraft>(localStorage, DRAFT_KEY);
        if (
          kept &&
          JSON.stringify(kept.files) !== JSON.stringify(loaded.files)
        ) {
          // The same files on disk as when the draft began, as after a
          // picture made here reloads the page: carry on with it. Changed
          // on disk since: ask.
          if (kept.disk === JSON.stringify(loaded.files)) {
            dispatch({ type: "reset", next: kept.files });
          } else setRestore(kept);
        }
      })
      .catch((reason: unknown) => setError(String(reason)));
  }, []);

  const disk = React.useMemo(
    () => (state ? JSON.stringify(state.files) : ""),
    [state]
  );
  const changed = state && draft ? changedFiles(state.files, draft) : [];

  // The draft is kept on every change until it's saved or thrown away.
  React.useEffect(() => {
    if (!state || !draft || restore) return;
    store(
      localStorage,
      DRAFT_KEY,
      changed.length > 0 ? ({ disk, files: draft } satisfies StoredDraft) : null
    );
  }, [state, draft, disk, restore, changed.length]);

  const problems = React.useMemo(() => {
    if (!state || !draft) return [];
    const existing = new Set([
      ...state.existing,
      ...pictures.map(({ path }) => path),
      ...made,
    ]);
    return checkContent(
      { ...draft, idsLock: nextLock(state.shipped, draft) },
      { pictureFiles, exists: (path) => existing.has(path) }
    );
  }, [state, draft, pictures, made]);

  const update = React.useCallback(
    (change: (files: ContentFiles) => ContentFiles) =>
      dispatch({
        type: "edit",
        change: (files) => (files ? change(files) : files),
        at: Date.now(),
      }),
    []
  );

  // Ctrl+Z and Ctrl+Y (or Ctrl+Shift+Z) anywhere, text boxes too: what's
  // typed in one is the draft's, so the draft's history undoes it. A box
  // that isn't the draft's says so with data-own-undo.
  React.useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const way = undoKey(event);
      if (!way) return;
      const target = event.target as Element | null;
      if (target?.closest?.("[data-own-undo]")) return;
      event.preventDefault();
      dispatch({ type: way });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (error) {
    return (
      <Shell>
        <TopBar>
          <Brand>Heardle admin</Brand>
        </TopBar>
        <Note $tone="bad" style={{ margin: 16 }}>
          {error}. Is `npm run admin` still running?
        </Note>
      </Shell>
    );
  }
  if (!state || !draft) return null;

  const save = async () => {
    setSaving(true);
    const result = await saveContent(draft).catch((reason: unknown) => ({
      ok: false as const,
      problems: [],
      error: String(reason),
    }));
    setSaving(false);
    if (!result.ok) {
      setFlash(
        result.error ?? "The server's check found problems: nothing was saved."
      );
      return;
    }
    store(localStorage, DRAFT_KEY, null);
    const line =
      result.written.length > 0
        ? `Saved ${result.written.join(", ")}. Next: npm test, then commit.`
        : "Nothing to save.";
    // Writing the files reloads the page (the game's code reads them), so
    // the line waits for after.
    store(sessionStorage, FLASH_KEY, line);
    setFlash(line);
    setState({ ...state, files: draft });
  };

  const { Component } = TABS[tab];
  const blocking = problems.length > 0;

  return (
    <Shell>
      <TopBar>
        <Brand>
          Heardle admin<span>on this PC</span>
        </Brand>
        <Tabs aria-label="Content">
          {(Object.keys(TABS) as TabId[]).map((id) => (
            <Tab
              key={id}
              type="button"
              $active={tab === id}
              onClick={() => {
                setTab(id);
                store(localStorage, "admin-tab", id);
              }}
            >
              {TABS[id].label}
            </Tab>
          ))}
        </Tabs>
        <Row>
          <Button
            disabled={history.past.length === 0}
            title="Undo (Ctrl+Z)"
            aria-label="Undo"
            onClick={() => dispatch({ type: "undo" })}
          >
            ↶ Undo
          </Button>
          <Button
            disabled={history.future.length === 0}
            title="Redo (Ctrl+Y or Ctrl+Shift+Z)"
            aria-label="Redo"
            onClick={() => dispatch({ type: "redo" })}
          >
            ↷ Redo
          </Button>
          {changed.length > 0 && (
            <small>
              Changed:{" "}
              {changed.map((name) => CONTENT_FILE_PATHS[name]).join(", ")}
            </small>
          )}
          <Button
            disabled={changed.length === 0 || saving}
            onClick={() => {
              if (
                window.confirm(
                  "Throw away every unsaved change? (Undo brings them back.)"
                )
              ) {
                setDraft(state.files);
              }
            }}
          >
            Discard
          </Button>
          <Button
            $variant="primary"
            disabled={changed.length === 0 || blocking || saving}
            title={
              blocking ? "Fix the problems first" : "Write the changed files"
            }
            onClick={save}
          >
            {saving ? "Saving…" : "Save"}
          </Button>
        </Row>
      </TopBar>

      <div>
        {restore && (
          <Note $tone="warn" style={{ margin: "10px 16px 0" }}>
            <Row>
              <span>
                There are unsaved changes from last time
                {restore.disk !== disk &&
                  ", and the files have changed on disk since: restoring puts the draft over them"}
                .
              </span>
              <Button
                $variant="primary"
                onClick={() => {
                  setDraft(restore.files);
                  setRestore(null);
                }}
              >
                Restore
              </Button>
              <Button
                onClick={() => {
                  store(localStorage, DRAFT_KEY, null);
                  setRestore(null);
                }}
              >
                Discard
              </Button>
            </Row>
          </Note>
        )}
        {flash && (
          <Note
            $tone={/^(Saved|Nothing)/.test(flash) ? "good" : "bad"}
            style={{ margin: "10px 16px 0" }}
          >
            {flash}
          </Note>
        )}
        {blocking && (
          <Note $tone="bad" style={{ margin: "10px 16px 0" }}>
            {problems.length === 1
              ? "1 problem"
              : `${problems.length} problems`}{" "}
            to fix before saving: {problems[0].message}
            {problems.length > 1 && " (and more, shown where they are)"}
          </Note>
        )}
      </div>

      <Body>
        <Component
          draft={draft}
          update={update}
          shipped={state.shipped}
          problems={problems}
          state={state}
          pictures={pictures}
          onPictures={(list, file) => {
            setPictures(list);
            if (file) setMade((files) => [...files, file]);
            setPictureVersion(String(Date.now()));
          }}
          pictureVersion={pictureVersion}
        />
      </Body>
    </Shell>
  );
}
