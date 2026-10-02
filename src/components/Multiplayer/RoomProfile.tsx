import styled from "styled-components";

import { ProfileSummary, ProfileViewAnswer } from "../../types/account";
import { PlayerView } from "../../types/room";
import { SERVER_NAMES } from "../../types/server";

import { PopUp } from "../PopUp";
import { PlayerCard, roomLook } from "../Profile/PlayerCard";
import { Tile, VerifiedRecord } from "../Profile/Verified";
import * as ProfileStyled from "../Profile/index.styled";

import { Avatar } from "./PlayerList";

/** A profile asked for from a card: on its way, shown, or not to be had. */
export type RoomProfileState =
  | { status: "loading" }
  | { status: "shown"; answer: ProfileViewAnswer }
  | { status: "hidden" }
  | { status: "failed" };

/** What verified means, said of another player (verified-stats.md, 1). */
const VERIFIED_NOTE =
  "Verified results are dailies their account started before they played " +
  "and the server judged itself, and room games the room signed. They " +
  "aren't cheat-proof: an answer can still be looked up.";

const number = (value: number) => value.toLocaleString("en-US");

/**
 * The record under the card, the width of the pop-up and read from the
 * left, as on the player's own profile (the pop-up centres its content).
 */
const Record = styled.div`
  align-self: stretch;
  box-sizing: border-box;
  width: 100%;
  margin-top: 14px;
  text-align: left;
`;

/** Their own record, from their saves, as their summary has it. */
function OwnRecord({ summary }: { summary: ProfileSummary }) {
  return (
    <>
      <ProfileStyled.Tiles>
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
      </ProfileStyled.Tiles>
    </>
  );
}

/**
 * Another player's profile, from their card in a room
 * (docs/room-profiles.md): their card as the room shows it, their verified
 * record, the server's, and the summary of their own saves, marked as
 * theirs, unverified. Read-only; nothing of it is kept after the room.
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
  return (
    <PopUp title={`${player.name}'s profile`} wide onClose={onClose}>
      <PlayerCard
        look={roomLook(player.name, player.icon, false, player.look)}
        face={(size) => (
          <Avatar icon={player.icon} name={player.name} size={size} />
        )}
      />
      <Record>
        {state.status === "loading" ? (
          <ProfileStyled.Note role="status">
            Opening their profile…
          </ProfileStyled.Note>
        ) : state.status === "hidden" ? (
          <ProfileStyled.Note role="status">
            {player.name} keeps their profile to themselves.
          </ProfileStyled.Note>
        ) : state.status === "failed" ? (
          <ProfileStyled.AccountPanel>
            <ProfileStyled.AccountLead>
              {"Their profile couldn't be opened just now."}
            </ProfileStyled.AccountLead>
            <ProfileStyled.AccountButtons>
              <ProfileStyled.AccountButton type="button" onClick={onRetry}>
                Try again
              </ProfileStyled.AccountButton>
            </ProfileStyled.AccountButtons>
          </ProfileStyled.AccountPanel>
        ) : (
          <>
            <ProfileStyled.Heading>Verified</ProfileStyled.Heading>
            <VerifiedRecord
              record={state.answer.verified}
              note={VERIFIED_NOTE}
            />
            <ProfileStyled.Heading>From their own saves</ProfileStyled.Heading>
            <ProfileStyled.Note>
              Not verified: worked out in their own browser, from saves they can
              change.
            </ProfileStyled.Note>
            {state.answer.summary ? (
              <OwnRecord summary={state.answer.summary} />
            ) : (
              <ProfileStyled.Note>Nothing synced yet.</ProfileStyled.Note>
            )}
          </>
        )}
      </Record>
    </PopUp>
  );
}
