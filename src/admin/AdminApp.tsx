import React from "react";

import { pictureFiles } from "../constants/pictureFiles";
import { CONTENT_FILE_PATHS, type ContentFiles } from "../content/types";
import { checkContent } from "../content/validate";
import { type ContentState, loadContent, saveContent } from "./api";
import { changedFiles } from "./draft";
import { nextLock } from "./lock";
import { MissionsTab } from "./MissionsTab";
import { RewardsTab } from "./RewardsTab";
import { Brand, Body, Button, Note, Row, Shell, Tab, Tabs, TopBar } from "./ui";
import { WhatsNewTab } from "./WhatsNewTab";

const TABS = {
  missions: { label: "Missions", Component: MissionsTab },
  rewards: { label: "Rewards", Component: RewardsTab },
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
  const [draft, setDraft] = React.useState<ContentFiles | null>(null);
  const [error, setError] = React.useState("");
  const [tab, setTab] = React.useState<TabId>(
    () => readStored<TabId>(localStorage, "admin-tab") ?? "missions"
  );
  const [restore, setRestore] = React.useState<StoredDraft | null>(null);
  const [flash, setFlash] = React.useState(
    () => readStored<string>(sessionStorage, FLASH_KEY) ?? ""
  );
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    store(sessionStorage, FLASH_KEY, null);
    loadContent()
      .then((loaded) => {
        setState(loaded);
        setDraft(loaded.files);
        const kept = readStored<StoredDraft>(localStorage, DRAFT_KEY);
        if (
          kept &&
          JSON.stringify(kept.files) !== JSON.stringify(loaded.files)
        ) {
          setRestore(kept);
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
    const existing = new Set(state.existing);
    return checkContent(
      { ...draft, idsLock: nextLock(state.shipped, draft) },
      { pictureFiles, exists: (path) => existing.has(path) }
    );
  }, [state, draft]);

  const update = React.useCallback(
    (change: (files: ContentFiles) => ContentFiles) =>
      setDraft((files) => (files ? change(files) : files)),
    []
  );

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
          {changed.length > 0 && (
            <small>
              Changed:{" "}
              {changed.map((name) => CONTENT_FILE_PATHS[name]).join(", ")}
            </small>
          )}
          <Button
            disabled={changed.length === 0 || saving}
            onClick={() => {
              if (window.confirm("Throw away every unsaved change?")) {
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
        />
      </Body>
    </Shell>
  );
}
