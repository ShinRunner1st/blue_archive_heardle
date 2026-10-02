/**
 * A room in the preview frame, drawn by the game's own Lobby, round and
 * Standings from a made-up room of eight: you wear the reward being edited
 * (as Customize would have it, so a locked one shows as the default, as it
 * would in the game), and the others a mix of the rest, as room passes
 * would carry them.
 */
import styled from "styled-components";

import { ROOMS_SCENE } from "../components/Backdrop";
import { Lobby } from "../components/Multiplayer/Lobby";
import { RoundScreen } from "../components/Multiplayer/RoundScreen";
import { Standings } from "../components/Multiplayer/Standings";
import { songs } from "../constants";
import {
  BACKGROUNDS,
  BANNERS,
  CARD_TITLES,
  FRAMES,
} from "../constants/cosmetics";
import { students } from "../constants/students";
import type { CosmeticsFile } from "../content/types";
import { CosmeticKind, setPicked } from "../helpers/cosmetics";
import { saveClearedMissions } from "../helpers/missions";
import { pictureUrl } from "../helpers/season";
import {
  DEFAULT_ROOM_SETTINGS,
  PlayerView,
  RoomLook,
  RoomView,
} from "../types/room";
import type { PreviewView } from "./messages";

export type RoomScreen = "lobby" | "round" | "standings";

/** The lists a room's cards wear, by the kind each is in a look. */
const KINDS: Array<{
  list: keyof CosmeticsFile;
  look: keyof RoomLook;
  kind: CosmeticKind;
}> = [
  { list: "titles", look: "title", kind: "title" },
  { list: "banners", look: "banner", kind: "banner" },
  { list: "frames", look: "frame", kind: "frame" },
  { list: "backgrounds", look: "background", kind: "background" },
];

/** Whether a list's rewards show on the cards rooms draw. */
export const SHOWN_IN_ROOMS = new Set<keyof CosmeticsFile>(
  KINDS.map(({ list }) => list)
);

const NAMES = [
  "Sensei",
  "Hoshino",
  "Yuuka",
  "Momoi",
  "Midori",
  "Aris",
  "Hina",
  "Shiroko",
];

const Page = styled.div<{ $src: string }>`
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  background: ${({ theme }) => theme.background1} center / cover no-repeat;
  background-image: url("${({ $src }) => $src}");
  color: ${({ theme }) => theme.text};
  font-family: "Nunito Sans Variable";
`;

/** Where the header, game bar and birthday note stand in the game. */
const Top = styled.div`
  flex: none;
  height: 190px;
`;

const PlayArea = styled.div`
  flex: 1 1 0;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const Column = styled.main`
  width: min(600px, 90%);
  padding-bottom: 40px;
`;

/**
 * Puts the draft's lists in this frame's own copy of the game, which only
 * the preview runs, so the cards find a reward still being made.
 */
function wearDraftLists(cosmetics: CosmeticsFile) {
  const swap = <T,>(into: T[], from: unknown[]) =>
    into.splice(0, into.length, ...(from as T[]));
  swap(CARD_TITLES, cosmetics.titles);
  swap(BANNERS, cosmetics.banners);
  swap(FRAMES, cosmetics.frames);
  swap(BACKGROUNDS, cosmetics.backgrounds);
}

/** A made-up room of eight, at the screen asked for. */
function sampleRoom(
  screen: RoomScreen,
  cosmetics: CosmeticsFile,
  list: keyof CosmeticsFile,
  index: number
): RoomView {
  const icons = students.slice(0, NAMES.length).map(({ id }) => id);
  // The round shown is the fourth (3): its answer is the fourth result's.
  const answer = songs[3].themeNo;
  const looks = NAMES.map(
    (_, i) =>
      Object.fromEntries(
        KINDS.map(({ list: name, look }) => {
          const items = cosmetics[name];
          // You (0) wear the one edited; the others a mix of the rest.
          const at =
            name === list
              ? i === 0
                ? index
                : (index + i) % items.length
              : i === 0
              ? 0
              : (i * 3) % items.length;
          return [look, items[at]?.id ?? items[0].id];
        })
      ) as unknown as RoomLook
  );
  const scores = [7, 9, 4, 7, 2, 5, 0, 3];
  const players: PlayerView[] = NAMES.map((name, i) => ({
    id: `p${i}`,
    name,
    icon: icons[i] ?? null,
    look: looks[i],
    score: screen === "lobby" ? 0 : scores[i],
    time: 4000 + i * 1300,
    here: true,
    ready: 3,
    answered: screen === "round",
    sent: screen === "round" ? 1800 + i * 900 : undefined,
    returned: false,
    last:
      screen === "round"
        ? {
            pick: i % 3 === 2 ? songs[5].themeNo : answer,
            right: i % 3 !== 2,
            ms: 1800 + i * 900,
          }
        : undefined,
  }));
  const results = Array.from({ length: screen === "standings" ? 10 : 4 }).map(
    (_, r) => ({
      answer: songs[r % songs.length].themeNo,
      right: players.filter((_, i) => (i + r) % 3 !== 2).map((p) => p.id),
    })
  );
  return {
    code: "KVTS",
    you: "p0",
    host: "p0",
    settings: DEFAULT_ROOM_SETTINGS,
    players,
    phase:
      screen === "lobby" ? "lobby" : screen === "round" ? "reveal" : "over",
    round: screen === "lobby" ? -1 : 3,
    total: 10,
    startsIn: null,
    endsIn: screen === "lobby" ? null : 30_000,
    maxIn: null,
    settling: false,
    access: "open",
    results: screen === "lobby" ? [] : results,
  };
}

const nothing = () => {};

export function RoomPreview({
  view,
  screen,
  night,
}: {
  view: Extract<PreviewView, { kind: "rewards" }>;
  screen: RoomScreen;
  night: boolean;
}) {
  const { cosmetics, list, index, unlocked, missions } = view;
  wearDraftLists(cosmetics);
  // Your own card wears what Customize has picked, in this frame's own
  // storage: the one edited, the rest their defaults, unlocked or not.
  saveClearedMissions(unlocked ? missions.map(({ id }) => id) : []);
  for (const { list: name, kind } of KINDS) {
    const items = cosmetics[name];
    setPicked(kind, (name === list ? items[index] : items[0])?.id ?? "");
  }
  const room = sampleRoom(screen, cosmetics, list, index);
  const props = {
    view: room,
    receivedAt: Date.now(),
    send: nothing,
    onLeave: nothing,
  };
  return (
    <Page $src={pictureUrl(night ? ROOMS_SCENE.night : ROOMS_SCENE.day)}>
      <Top />
      <PlayArea>
        <Column>
          {screen === "lobby" ? (
            <Lobby {...props} />
          ) : screen === "standings" ? (
            <Standings {...props} />
          ) : (
            <RoundScreen {...props} session={0} keyboardEnabled={false} />
          )}
        </Column>
      </PlayArea>
    </Page>
  );
}
