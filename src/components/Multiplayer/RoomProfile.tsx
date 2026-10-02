import React from "react";

import { dateOfDay } from "../../helpers/daily";
import { ProfileSummary, ProfileViewAnswer } from "../../types/account";
import { PlayerView } from "../../types/room";
import { SERVER_NAMES } from "../../types/server";

import { PopUp } from "../PopUp";
import { roomLook } from "../Profile/PlayerCard";
import { ProfileHero } from "../Profile/ProfileCard";
import { ProfileFrame } from "../Profile/ProfileFrame";
import { Tile, VerifiedRecord } from "../Profile/Verified";
import * as Styled from "../Profile/index.styled";

/** A profile asked for from a card: on its way, shown, or not to be had. */
export type RoomProfileState =
  | { status: "loading" }
  | { status: "shown"; answer: ProfileViewAnswer }
  | { status: "hidden" }
  | { status: "failed" };

type Tab = "verified" | "saves";

const TABS: Array<{ id: Tab; label: string }> = [
  { id: "verified", label: "Verified" },
  { id: "saves", label: "Their saves" },
];

/** What verified means, said of another player (verified-stats.md, 1). */
const VERIFIED_NOTE =
  "Verified results are dailies their account started before they played " +
  "and the server judged itself, and room games the room signed. They " +
  "aren't cheat-proof: an answer can still be looked up.";

const number = (value: number) => value.toLocaleString("en-US");

const dayDate = (day: number) =>
  dateOfDay(day).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

/** Their own record, from their saves, as their summary has it. */
function OwnRecord({ summary }: { summary: ProfileSummary | null }) {
  return (
    <>
      <Styled.Note>
        Not verified: worked out in their own browser, from saves they can
        change.
      </Styled.Note>
      {summary ? (
        <Styled.Tiles>
          <Tile label="Rounds played" value={number(summary.roundsPlayed)} />
          <Tile label="Days played" value={number(summary.daysPlayed)} />
          <Tile label="Dailies won" value={number(summary.dailiesWon)} />
          <Tile
            label="Best daily streak"
            value={String(summary.bestDailyStreak)}
          />
          <Tile label="Best win streak" value={String(summary.bestWinStreak)} />
          <Tile label="Songs guessed" value={number(summary.songsGuessed)} />
          <Tile
            label="Students found"
            value={number(summary.studentsFound)}
            sub={SERVER_NAMES[summary.server] ?? undefined}
          />
          <Tile label="Missions" value={number(summary.missionsCleared)} />
          <Tile label="OST badges" value={number(summary.badgesEarned)} />
          <Tile
            label="Room games"
            value={number(summary.roomGames)}
            sub={`${number(summary.roomWins)} first places`}
          />
        </Styled.Tiles>
      ) : (
        <Styled.Note>Nothing synced yet.</Styled.Note>
      )}
    </>
  );
}

/**
 * Another player's profile, from their card in a room
 * (docs/room-profiles.md), laid out as the player's own: their card's look
 * across the head (the cosmetics the room shows them in), and two tabs,
 * their verified record, the server's, and the summary of their own saves,
 * marked as theirs, unverified. Read-only; nothing of it is kept after the
 * room.
 */
export function RoomProfile({
  player,
  state,
  onRetry,
  onClose,
}: {
  player: PlayerView;
  state: RoomProfileState;
  onRetry: () => void;
  onClose: () => void;
}) {
  const [tab, setTab] = React.useState<Tab>("verified");
  const look = roomLook(player.name, player.icon, false, player.look);
  const since =
    state.status === "shown" && state.answer.verified.since !== null
      ? `Verified since ${dayDate(state.answer.verified.since)}`
      : state.status === "shown"
      ? "Nothing verified yet"
      : "In this room with you";
  const shown = TABS.find(({ id }) => id === tab)!;

  return (
    <PopUp
      wide
      bleed
      fixed
      title={`${player.name}'s profile`}
      onClose={onClose}
      head={
        <>
          <ProfileHero look={look} actions={null}>
            <Styled.Meta>{since}</Styled.Meta>
          </ProfileHero>
          {state.status === "shown" && (
            <Styled.Body>
              <Styled.Tabs role="tablist" aria-label="Profile">
                {TABS.map(({ id, label }) => (
                  <Styled.Tab
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={tab === id}
                    $active={tab === id}
                    onClick={() => setTab(id)}
                  >
                    {label}
                  </Styled.Tab>
                ))}
              </Styled.Tabs>
            </Styled.Body>
          )}
        </>
      }
      frame={(panel) => (
        <ProfileFrame frame={look.frame} popUp>
          {panel}
        </ProfileFrame>
      )}
    >
      <Styled.Page
        role={state.status === "shown" ? "tabpanel" : undefined}
        aria-label={state.status === "shown" ? shown.label : undefined}
      >
        {state.status === "loading" ? (
          <Styled.Note role="status">Opening their profile…</Styled.Note>
        ) : state.status === "hidden" ? (
          <Styled.Note role="status">
            {player.name} keeps their profile to themselves.
          </Styled.Note>
        ) : state.status === "failed" ? (
          <Styled.AccountPanel>
            <Styled.AccountLead>
              {"Their profile couldn't be opened just now."}
            </Styled.AccountLead>
            <Styled.AccountButtons>
              <Styled.AccountButton type="button" onClick={onRetry}>
                Try again
              </Styled.AccountButton>
            </Styled.AccountButtons>
          </Styled.AccountPanel>
        ) : tab === "verified" ? (
          <VerifiedRecord record={state.answer.verified} note={VERIFIED_NOTE} />
        ) : (
          <OwnRecord summary={state.answer.summary} />
        )}
      </Styled.Page>
    </PopUp>
  );
}
