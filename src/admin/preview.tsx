/**
 * The admin tool's preview frame: the game's own components, drawn from
 * the draft the editor sends, over the game's background. It runs in a
 * frame, so the pop-ups' overlay, focus and keys stay inside it.
 */
import "@fontsource-variable/nunito-sans";
import React from "react";
import { createRoot, type Root } from "react-dom/client";
import styled, { ThemeProvider } from "styled-components";

import { MissionsView } from "../components/MissionsPopUp";
import { MissionToast } from "../components/MissionToast";
import { WhatsNewPopUp } from "../components/WhatsNewPopUp";
import { iconNamed } from "../constants/icons";
import { themes } from "../constants/theme";
import { applyColorSchemeToDocument } from "../helpers/colorScheme";
import { unlocksOf } from "../helpers/cosmetics";
import { goalOf } from "../helpers/missions";
import type { PreviewMessage, PreviewView } from "./messages";
import { CharacterPreview } from "./CharacterPreview";
import { RewardsPreview } from "./RewardsPreview";
import {
  BadgesPreview,
  PicturePreview,
  SeasonPreview,
} from "./ContentPreviews";
import "../index.css";

const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  background: ${({ theme }) => theme.background1} center / cover no-repeat
    url(${({ theme }) => theme.backgroundImage});
`;

const nothing = () => {};

function View({ view, night }: { view: PreviewView; night: boolean }) {
  if (view.kind === "picture") return <PicturePreview view={view} />;
  if (view.kind === "character") return <CharacterPreview view={view} />;
  if (view.kind === "season")
    return <SeasonPreview view={view} night={night} />;
  if (view.kind === "badges") return <BadgesPreview view={view} />;
  if (view.kind === "whatsNew") {
    return (
      <WhatsNewPopUp
        onClose={nothing}
        updates={view.updates.map(({ id, name, items }) => ({
          id,
          name,
          items: items.map(({ icon, title, text }) => ({
            icon: iconNamed(icon),
            title,
            text,
          })),
        }))}
      />
    );
  }

  if (view.kind === "rewards") return <RewardsPreview view={view} />;
  return <MissionsPreview view={view} />;
}

function MissionsPreview({
  view,
}: {
  view: Extract<PreviewView, { kind: "missions" }>;
}) {
  // The mission being edited scrolled into sight in the pop-up's list.
  React.useEffect(() => {
    if (!view.selected) return;
    document
      .querySelector(`[data-mission="${CSS.escape(view.selected)}"]`)
      ?.scrollIntoView({ block: "center" });
  }, [view.selected, view.group]);

  const unlocks = (id: string) => unlocksOf(id, view.cosmetics);
  const selected = view.missions.find(({ id }) => id === view.selected);
  if (view.toast && selected) {
    return (
      <MissionToast
        toast={{ kind: "mission", mission: selected }}
        unlocks={unlocks(selected.id)}
        onDismiss={nothing}
        onOpen={nothing}
      />
    );
  }
  // As a player sees them: the edited mission at the progress picked, the
  // rest not started; a retired one only shows to whoever cleared it.
  const all = view.missions
    .filter((mission) => !mission.retired || mission === selected)
    .map((mission) => {
      const goal = goalOf(mission);
      const value = mission === selected ? Math.min(view.value, goal) : 0;
      return {
        mission,
        goal,
        value,
        done: mission === selected && (!!mission.retired || value >= goal),
      };
    });
  return (
    <MissionsView
      key={view.group}
      all={all}
      groups={view.groups}
      unlocks={unlocks}
      group={view.group}
      onClose={nothing}
    />
  );
}

function Preview() {
  const [message, setMessage] = React.useState<PreviewMessage | null>(null);

  React.useEffect(() => {
    const take = (event: MessageEvent) => {
      if (
        event.origin === window.location.origin &&
        event.data?.type === "admin-preview"
      ) {
        setMessage(event.data as PreviewMessage);
      }
    };
    window.addEventListener("message", take);
    window.parent.postMessage(
      { type: "admin-preview-ready" },
      window.location.origin
    );
    return () => window.removeEventListener("message", take);
  }, []);

  const scheme = message?.scheme ?? "light";
  React.useLayoutEffect(() => applyColorSchemeToDocument(scheme), [scheme]);

  if (!message) return null;
  return (
    <ThemeProvider theme={themes[scheme]}>
      <Backdrop />
      <View view={message.view} night={scheme === "dark"} />
    </ThemeProvider>
  );
}

// Kept on the element, as in main.tsx: Vite may run this module again.
const root = document.getElementById("root") as
  | (HTMLElement & { reactRoot?: Root })
  | null;
if (root) {
  root.reactRoot ??= createRoot(root);
  root.reactRoot.render(<Preview />);
}
