/**
 * The pages' pictures in the preview frame, behind the game's own pages:
 * the hub over the home background or a streak place, the hub's cards
 * with the draft's scenes, and the page before a room over Multiplayer's.
 */
import styled from "styled-components";

import { Hub } from "../components/Hub";
import { Entry } from "../components/Multiplayer/Entry";
import { PAGE_PICTURES } from "../constants/pagePictures";
import { pictureFiles } from "../constants/pictureFiles";
import { pictureUrl } from "../helpers/season";
import type { PreviewView } from "./messages";

const Page = styled.div<{ $src: string }>`
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  background: ${({ theme }) => theme.background1} center / cover no-repeat;
  background-image: ${({ $src }) => ($src ? `url("${$src}")` : "none")};
  color: ${({ theme }) => theme.text};
  font-family: "Nunito Sans Variable";
`;

/** Where the header, game bar and birthday note stand in the game. */
const Top = styled.div`
  flex: none;
  height: 150px;
`;

const PlayArea = styled.div`
  flex: 1 1 0;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

/** The game's play area: a column that centres what's wider. */
const Column = styled.main`
  display: flex;
  flex-direction: column;
  width: min(632px, 92%);
  padding-bottom: 40px;
`;

/** What the picture is, over the page's top where the header would be. */
const Note = styled.p`
  position: fixed;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  max-width: min(640px, 90%);
  margin: 0;
  padding: 10px 16px;
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.6);
  color: white;
  font: 600 15px/1.4 "Nunito Sans Variable";
  text-align: center;
  z-index: 3;
`;

const nothing = () => {};

/** A Worker picture's address, if it's in the list yet. */
const workerUrl = (key: string) => (pictureFiles[key] ? pictureUrl(key) : "");

export function PagePreview({
  view,
  night,
}: {
  view: Extract<PreviewView, { kind: "page" }>;
  night: boolean;
}) {
  // The cards read the hub's scenes from this frame's own copy of the
  // content, which only the preview runs.
  Object.assign(PAGE_PICTURES.hub, view.hub);
  const cards = JSON.stringify(view.hub);

  if (view.part === "rooms") {
    const src = workerUrl(night ? view.rooms.night : view.rooms.day);
    return (
      <Page $src={src}>
        <Note>
          Multiplayer&apos;s background, {night ? "by night" : "by day"}
          {src ? "" : ": not made yet"}.
        </Note>
        <Top />
        <PlayArea>
          <Column>
            <Entry
              key={cards}
              status="idle"
              error={null}
              linked={null}
              onCreate={nothing}
              onJoin={nothing}
              onProfile={nothing}
            />
          </Column>
        </PlayArea>
      </Page>
    );
  }

  const src = night ? view.night : view.day;
  const note =
    view.part === "place"
      ? `At ${view.wins ?? "?"} wins in a row: “📍 New place unlocked: ${
          view.name || "…"
        }!”`
      : view.part === "home"
      ? `The background below the first place. After a lost streak: “Back to ${
          view.name || "…"
        }.”`
      : "The hub's cards, each over its scene.";
  return (
    <Page $src={src}>
      <Note>
        {note}
        {src ? "" : ` No ${night ? "night" : "day"} picture yet.`}
      </Note>
      <Top />
      <PlayArea>
        <Column>
          <Hub
            key={cards}
            onOpen={nothing}
            onMissions={nothing}
            onProfile={nothing}
          />
        </Column>
      </PlayArea>
    </Page>
  );
}
